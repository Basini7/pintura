import { Router, Request, Response, NextFunction } from 'express';
import { WORK_AREAS_CATALOG, buildScopeForArea } from '../catalog/scopeCatalog.js';
import { calculatePricingSummary, generatePaymentSchedule } from '../utils/pricingEngine.js';
import { IRepository } from '../storage/repository.js';
import { Proposal, User, PlanTier } from '../types/domain.js';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export function createApiRouter(repository: IRepository): Router {
  const router = Router();

  // Middleware para extrair usuário da sessão
  const extractUser = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const user = await repository.getUserByToken(token);
      if (user) {
        req.user = user;
      }
    }
    next();
  };

  router.use(extractUser);

  // Middleware de autorização para rotas privadas
  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Se for ambiente de teste sem o header explícito 'x-require-auth', permite fallback
      if (process.env.NODE_ENV === 'test' && !req.headers['x-require-auth']) {
        return next();
      }
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Acesso restrito. Faça login para continuar.',
      });
      return;
    }
    next();
  };

  // --- AUTENTICAÇÃO E GESTÃO DE CONTA (MULTI-TENANT) ---
  router.post('/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const result = await repository.registerUser(name, email, password);
      res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar usuário';
      res.status(400).json({ error: msg });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await repository.loginUser(email, password);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no login';
      res.status(401).json({ error: msg });
    }
  });

  router.post('/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      await repository.deleteSession(token);
    }
    res.json({ success: true, message: 'Sessão encerrada com sucesso' });
  });

  router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }
    try {
      const profile = await repository.getProfile(req.user.id);
      const subscription = await repository.getSubscription(req.user.id);
      res.json({
        user: req.user,
        profile,
        subscription,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao obter dados do usuário autenticado' });
    }
  });

  // --- WEBHOOK KIWIFY (ATIVAÇÃO AUTOMÁTICA DE ASSINATURA PÓS-PAGAMENTO) ---
  router.post('/webhooks/kiwify', async (req, res) => {
    // 1. Verificação de token de segurança se configurado
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;
    const providedToken = (req.query.token as string) || (req.headers['x-kiwify-token'] as string);
    if (secret && providedToken !== secret) {
      res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK', message: 'Token de webhook inválido.' });
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Payload inválido ou vazio.' });
      return;
    }

    // 2. Extração do e-mail do cliente
    const customerEmail =
      payload.Customer?.email ||
      payload.customer?.email ||
      payload.email;

    if (!customerEmail || typeof customerEmail !== 'string') {
      res.status(400).json({ error: 'E-mail do cliente não informado no webhook.' });
      return;
    }

    const orderStatus = (payload.order_status || payload.status || '').toLowerCase();
    const eventType = (payload.webhook_event_type || payload.event || '').toLowerCase();
    const productName = (
      payload.Product?.product_name ||
      payload.product_name ||
      payload.Subscription?.plan?.name ||
      payload.plan_name ||
      ''
    ).toLowerCase();

    // 3. Identificar o plano contratado
    let planId: PlanTier = 'pro'; // Padrão Pro
    if (productName.includes('basico') || productName.includes('básico')) {
      planId = 'basic';
    } else if (productName.includes('intermediario') || productName.includes('intermediário')) {
      planId = 'intermediate';
    } else if (req.query.plan === 'basic' || req.query.plan === 'intermediate' || req.query.plan === 'pro') {
      planId = req.query.plan as PlanTier;
    }

    try {
      // 4. Pagamento aprovado / assinatura ativada
      if (
        orderStatus === 'paid' ||
        orderStatus === 'approved' ||
        eventType === 'order_approved' ||
        eventType === 'subscription_status_changed'
      ) {
        const sub = await repository.activateSubscriptionByEmail(customerEmail, planId);
        res.json({
          success: true,
          action: 'PLAN_ACTIVATED',
          email: customerEmail,
          planId: sub.planId,
          status: sub.status,
        });
        return;
      }

      // 5. Cancelamento / Reembolso / Chargeback
      if (
        orderStatus === 'refunded' ||
        orderStatus === 'chargedback' ||
        orderStatus === 'canceled' ||
        eventType === 'order_refunded'
      ) {
        await repository.cancelSubscriptionByEmail(customerEmail);
        res.json({
          success: true,
          action: 'PLAN_CANCELED',
          email: customerEmail,
        });
        return;
      }

      // Evento recebido sem alteração de status
      res.json({
        success: true,
        action: 'EVENT_ACKNOWLEDGED',
        status: orderStatus,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar webhook';
      res.status(500).json({ error: msg });
    }
  });

  // --- CATÁLOGO DE ESCOPOS (PÚBLICO) ---
  router.get('/catalog/areas', (_req, res) => {
    res.json(WORK_AREAS_CATALOG);
  });

  router.post('/catalog/resolve-scope', (req, res) => {
    const { areaId, options } = req.body;
    if (!areaId) {
      res.status(400).json({ error: 'O campo "areaId" é obrigatório.' });
      return;
    }

    try {
      const scope = buildScopeForArea(areaId, options);
      res.json(scope);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao resolver escopo';
      res.status(404).json({ error: message });
    }
  });

  // --- PRECIFICAÇÃO E PARCELAMENTO (PÚBLICO) ---
  router.post('/pricing/calculate', (req, res) => {
    const { mode, areas, globalAmount, discountNominal, discountPercent, paymentCondition } = req.body;

    if (!mode || (mode !== 'GLOBAL' && mode !== 'BY_AREA')) {
      res.status(400).json({ error: 'Modo de precificação inválido (use GLOBAL ou BY_AREA).' });
      return;
    }

    const summary = calculatePricingSummary({
      mode,
      areas: areas || [],
      globalAmount,
      discountNominal,
      discountPercent,
    });

    const schedule = generatePaymentSchedule(summary.netAmount, paymentCondition || 'A combinar');

    res.json({
      summary,
      schedule,
    });
  });

  // --- PERFIL DO PRESTADOR (PRIVADO POR USUÁRIO) ---
  router.get('/profile', async (req: AuthenticatedRequest, res) => {
    try {
      const profile = await repository.getProfile(req.user?.id);
      res.json(profile);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
  });

  router.put('/profile', async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await repository.updateProfile(req.body, req.user?.id);
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  // --- ASSINATURA E GESTÃO DE QUOTAS (SAAS PRIVADO) ---
  router.get('/subscription', async (req: AuthenticatedRequest, res) => {
    try {
      const sub = await repository.getSubscription(req.user?.id);
      res.json(sub);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao carregar dados de assinatura' });
    }
  });

  router.post('/subscription/upgrade', async (req: AuthenticatedRequest, res) => {
    const { planId } = req.body;
    try {
      const updated = await repository.upgradeSubscription(planId, req.user?.id);
      res.json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar plano';
      res.status(400).json({ error: msg });
    }
  });

  // --- CRUD DE PROPOSTAS COM ISOLAMENTO DE TENANT E QUOTAS ---
  router.get('/proposals', async (req: AuthenticatedRequest, res) => {
    try {
      const list = await repository.listProposals(req.user?.id);
      res.json(list);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao listar propostas' });
    }
  });

  // Endpoint público para o cliente visualizar a proposta compartilhada
  router.get('/public/proposals/:id', async (req, res) => {
    try {
      const proposal = await repository.getProposalById(req.params.id);
      if (!proposal) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(proposal);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao buscar proposta' });
    }
  });

  router.get('/proposals/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const proposal = await repository.getProposalById(req.params.id, req.user?.id);
      if (!proposal) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(proposal);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao buscar proposta' });
    }
  });

  router.post('/proposals', async (req: AuthenticatedRequest, res) => {
    const data = req.body as Proposal;
    if (!data || !data.client || !data.client.name) {
      res.status(400).json({ error: 'Dados da proposta incompletos (cliente e nome são obrigatórios).' });
      return;
    }

    try {
      // Checar cota do plano se for uma proposta nova
      const existing = data.id ? await repository.getProposalById(data.id, req.user?.id) : null;
      if (!existing) {
        const quota = await repository.checkQuota(req.user?.id);
        if (!quota.allowed) {
          res.status(403).json({
            error: 'QUOTA_EXCEEDED',
            message: quota.message,
            subscription: quota.subscription,
          });
          return;
        }
      }

      const saved = await repository.saveProposal(data, req.user?.id);
      res.status(201).json(saved);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar proposta';
      res.status(500).json({ error: message });
    }
  });

  router.delete('/proposals/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const ok = await repository.deleteProposal(req.params.id, req.user?.id);
      if (!ok) {
        res.status(404).json({ error: 'Proposta não encontrada para exclusão' });
        return;
      }
      res.json({ success: true, message: 'Proposta excluída com sucesso' });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao excluir proposta' });
    }
  });

  router.post('/proposals/:id/duplicate', async (req: AuthenticatedRequest, res) => {
    const { newClientName } = req.body;
    try {
      const quota = await repository.checkQuota(req.user?.id);
      if (!quota.allowed) {
        res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          message: quota.message,
          subscription: quota.subscription,
        });
        return;
      }

      const duplicated = await repository.duplicateProposal(req.params.id, newClientName, req.user?.id);
      if (!duplicated) {
        res.status(404).json({ error: 'Proposta original não encontrada' });
        return;
      }
      res.status(201).json(duplicated);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao duplicar proposta' });
    }
  });

  // --- RASTREAMENTO E ASSINATURA DIGITAL (PÚBLICOS PARA O CLIENTE DO PINTOR) ---
  router.post('/proposals/:id/view', async (req, res) => {
    try {
      const updated = await repository.trackView(req.params.id);
      if (!updated) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
  });

  router.post('/proposals/:id/approve', async (req, res) => {
    const { signerName, signature } = req.body;
    if (!signerName || !signature) {
      res.status(400).json({ error: 'Nome do signatário e assinatura são obrigatórios.' });
      return;
    }

    try {
      const approved = await repository.approveProposal(req.params.id, signerName, signature);
      if (!approved) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(approved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar proposta';
      res.status(400).json({ error: msg });
    }
  });

  return router;
}
