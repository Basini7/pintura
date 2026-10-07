import { Router, Request, Response, NextFunction } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { WORK_AREAS_CATALOG, buildScopeForArea } from '../catalog/scopeCatalog.js';
import { calculatePricingSummary, generatePaymentSchedule } from '../utils/pricingEngine.js';
import { IRepository } from '../storage/repository.js';
import { Proposal, PublicProposalDTO, User, PlanTier } from '../types/domain.js';

interface AuthenticatedRequest extends Request {
  user?: User;
}

function toPublicProposalDTO(proposal: Proposal): PublicProposalDTO {
  return {
    proposalNumber: proposal.proposalNumber,
    status: proposal.status,
    client: proposal.client,
    areas: proposal.areas,
    pricing: proposal.pricing,
    terms: proposal.terms,
    viewCount: proposal.viewCount,
    viewedAt: proposal.viewedAt,
    createdAt: proposal.createdAt,
    approvedAt: proposal.approvedAt,
    signerName: proposal.signerName,
  };
}

export function createApiRouter(repository: IRepository): Router {
  const router = Router();
  const sessionCookieName = 'pintura_session';
  const sessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };

  const getSessionCookie = (req: Request): string | undefined => {
    const cookies = req.headers.cookie?.split(';') || [];
    const sessionCookie = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${sessionCookieName}=`));
    return sessionCookie ? sessionCookie.slice(sessionCookieName.length + 1) : undefined;
  };

  const setSessionCookie = (res: Response, token: string) => {
    res.cookie(sessionCookieName, token, sessionCookieOptions);
  };

  // Middleware para extrair usuário da sessão
  const extractUser = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : getSessionCookie(req);
    if (token) {
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
      setSessionCookie(res, result.token);
      const { token: _token, ...authData } = result;
      res.status(201).json(authData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar usuário';
      res.status(400).json({ error: msg });
    }
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await repository.loginUser(email, password);
      setSessionCookie(res, result.token);
      const { token: _token, ...authData } = result;
      res.json(authData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha no login';
      res.status(401).json({ error: msg });
    }
  });

  router.post('/auth/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : getSessionCookie(req);
    if (token) {
      await repository.deleteSession(token);
    }
    const { maxAge: _maxAge, ...clearCookieOptions } = sessionCookieOptions;
    res.clearCookie(sessionCookieName, clearCookieOptions);
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
  router.post(['/webhooks/kiwify', '/webhooks/kiwify/:token'], async (req, res) => {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;
    const providedToken = req.get('x-kiwify-token') || req.params.token || '';
    const secretMatches = Boolean(secret && providedToken && Buffer.byteLength(secret) === Buffer.byteLength(providedToken)
      && timingSafeEqual(Buffer.from(secret), Buffer.from(providedToken)));
    if (!secretMatches) {
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

    const eventType = (payload.webhook_event_type || payload.event || '').toLowerCase();
    const productId = String(payload.Product?.product_id || payload.product_id || payload.Product?.id || '');
    const productPlans: Record<string, PlanTier> = {
      [process.env.KIWIFY_PRODUCT_ID_BASIC || '']: 'basic',
      [process.env.KIWIFY_PRODUCT_ID_INTERMEDIATE || '']: 'intermediate',
      [process.env.KIWIFY_PRODUCT_ID_PRO || '']: 'pro',
    };
    delete productPlans[''];
    const planId = productPlans[productId];
    const subscriptionStatus = String(
      payload.Subscription?.status || payload.subscription_status || payload.order_status || payload.status || ''
    ).toLowerCase();
    const activationEvent =
      (eventType === 'order_approved' && ['paid', 'approved'].includes(subscriptionStatus)) ||
      (eventType === 'subscription_status_changed' && subscriptionStatus === 'active');
    const cancellationEvent =
      ['refunded', 'chargedback', 'canceled', 'cancelled', 'inactive'].includes(subscriptionStatus) ||
      ['order_refunded', 'subscription_canceled', 'subscription_cancelled'].includes(eventType);

    const eventId = String(payload.webhook_event_id || payload.event_id || payload.id || createHash('sha256').update(JSON.stringify(payload)).digest('hex'));
    let claim: 'claimed' | 'processed' | 'processing';
    try {
      claim = await repository.claimWebhookEvent(eventId);
    } catch {
      res.status(503).json({ error: 'WEBHOOK_STORAGE_UNAVAILABLE' });
      return;
    }
    if (claim === 'processed') {
      res.json({ success: true, action: 'DUPLICATE_IGNORED' });
      return;
    }
    if (claim === 'processing') {
      res.status(409).json({ error: 'WEBHOOK_EVENT_IN_PROGRESS' });
      return;
    }

    if (activationEvent && !planId) {
      await repository.completeWebhookEvent(eventId);
      res.status(202).json({ success: true, action: 'UNKNOWN_PRODUCT_IGNORED' });
      return;
    }

    try {
      if (activationEvent && planId) {
        const sub = await repository.activateSubscriptionByEmail(customerEmail, planId);
        await repository.completeWebhookEvent(eventId);
        res.json({
          success: true,
          action: 'PLAN_ACTIVATED',
          email: customerEmail,
          planId: sub.planId,
          status: sub.status,
        });
        return;
      }

      if (cancellationEvent) {
        await repository.cancelSubscriptionByEmail(customerEmail);
        await repository.completeWebhookEvent(eventId);
        res.json({
          success: true,
          action: 'PLAN_CANCELED',
          email: customerEmail,
        });
        return;
      }

      // Evento recebido sem alteração de status
      await repository.completeWebhookEvent(eventId);
      res.json({
        success: true,
        action: 'EVENT_ACKNOWLEDGED',
        status: subscriptionStatus,
      });
    } catch (err: unknown) {
      await repository.releaseWebhookEvent(eventId).catch(() => undefined);
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

    const numericValues = [globalAmount, discountNominal, discountPercent].filter((value) => value !== undefined);
    if (numericValues.some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100_000_000)) {
      res.status(400).json({ error: 'Valores de precificação inválidos.' });
      return;
    }
    if (discountPercent !== undefined && discountPercent > 100) {
      res.status(400).json({ error: 'O desconto percentual deve estar entre 0 e 100.' });
      return;
    }
    if (areas !== undefined && (!Array.isArray(areas) || areas.length > 100 || areas.some((area) =>
      !area || typeof area !== 'object' || (area.price !== undefined &&
        (typeof area.price !== 'number' || !Number.isFinite(area.price) || area.price < 0 || area.price > 100_000_000))
    ))) {
      res.status(400).json({ error: 'Áreas ou valores por área inválidos.' });
      return;
    }
    if (paymentCondition !== undefined && (typeof paymentCondition !== 'string' || paymentCondition.length > 500)) {
      res.status(400).json({ error: 'Condição de pagamento inválida.' });
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
  router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const profile = await repository.getProfile(req.user!.id);
      res.json(profile);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao carregar perfil' });
    }
  });

  router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await repository.updateProfile(req.body, req.user!.id);
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });

  // --- ASSINATURA E GESTÃO DE QUOTAS (SAAS PRIVADO) ---
  router.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sub = await repository.getSubscription(req.user!.id);
      res.json(sub);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao carregar dados de assinatura' });
    }
  });

  // --- CRUD DE PROPOSTAS COM ISOLAMENTO DE TENANT E QUOTAS ---
  router.get('/proposals', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const list = await repository.listProposals(req.user!.id);
      res.json(list);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao listar propostas' });
    }
  });

  // Endpoints públicos usam um token aleatório separado do ID interno.
  router.get('/public/proposals/:token', async (req, res) => {
    try {
      const proposal = await repository.getPublicProposalByToken(req.params.token);
      if (!proposal?.userId) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      const [profile, subscription] = await Promise.all([
        repository.getProfile(proposal.userId),
        repository.getSubscription(proposal.userId),
      ]);
      res.json({
        proposal: toPublicProposalDTO(proposal),
        profile,
        hasWatermark: subscription.hasWatermark,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao buscar proposta' });
    }
  });

  router.get('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const proposal = await repository.getProposalById(req.params.id, req.user!.id);
      if (!proposal) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(proposal);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao buscar proposta' });
    }
  });

  router.post('/proposals', requireAuth, async (req: AuthenticatedRequest, res) => {
    const data = req.body as Proposal;
    if (!data || !data.client || !data.client.name) {
      res.status(400).json({ error: 'Dados da proposta incompletos (cliente e nome são obrigatórios).' });
      return;
    }

    try {
      const existing = data.id ? await repository.getProposalById(data.id, req.user!.id) : null;
      if (!existing) {
        const quota = await repository.checkQuota(req.user!.id);
        if (!quota.allowed) {
          res.status(403).json({
            error: 'QUOTA_EXCEEDED',
            message: quota.message,
            subscription: quota.subscription,
          });
          return;
        }
      }

      const now = new Date().toISOString();
      const proposalToSave: Proposal = {
        id: existing?.id || randomUUID(),
        userId: req.user!.id,
        publicToken: existing?.publicToken,
        proposalNumber: existing?.proposalNumber || '',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        status: existing?.status || 'DRAFT',
        viewCount: existing?.viewCount || 0,
        viewedAt: existing?.viewedAt,
        approvedAt: existing?.approvedAt,
        signerName: existing?.signerName,
        signature: existing?.signature,
        signerIp: existing?.signerIp,
        signerUserAgent: existing?.signerUserAgent,
        signedContentHash: existing?.signedContentHash,
        client: data.client,
        areas: Array.isArray(data.areas) ? data.areas : [],
        pricing: data.pricing,
        terms: data.terms,
      };
      const saved = await repository.saveProposal(proposalToSave, req.user!.id);
      res.status(201).json(saved);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar proposta';
      res.status(message === 'PROPOSAL_ALREADY_APPROVED' ? 409 : 500).json({ error: message });
    }
  });

  router.delete('/proposals/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const ok = await repository.deleteProposal(req.params.id, req.user!.id);
      if (!ok) {
        res.status(404).json({ error: 'Proposta não encontrada para exclusão' });
        return;
      }
      res.json({ success: true, message: 'Proposta excluída com sucesso' });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao excluir proposta' });
    }
  });

  router.post('/proposals/:id/duplicate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { newClientName } = req.body;
    try {
      const quota = await repository.checkQuota(req.user!.id);
      if (!quota.allowed) {
        res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          message: quota.message,
          subscription: quota.subscription,
        });
        return;
      }

      const duplicated = await repository.duplicateProposal(req.params.id, newClientName, req.user!.id);
      if (!duplicated) {
        res.status(404).json({ error: 'Proposta original não encontrada' });
        return;
      }
      res.status(201).json(duplicated);
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao duplicar proposta' });
    }
  });

  // --- RASTREAMENTO E ASSINATURA DIGITAL POR TOKEN PÚBLICO ---
  router.post('/public/proposals/:token/view', async (req, res) => {
    try {
      const updated = await repository.trackViewByPublicToken(req.params.token);
      if (!updated) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(toPublicProposalDTO(updated));
    } catch (err: unknown) {
      res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
  });

  router.post('/public/proposals/:token/approve', async (req, res) => {
    const { signerName, signature } = req.body;
    if (!signerName || !signature) {
      res.status(400).json({ error: 'Nome do signatário e assinatura são obrigatórios.' });
      return;
    }

    try {
      const approved = await repository.approveProposalByPublicToken(req.params.token, signerName, signature, {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
      });
      if (!approved) {
        res.status(404).json({ error: 'Proposta não encontrada' });
        return;
      }
      res.json(toPublicProposalDTO(approved));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aprovar proposta';
      res.status(msg === 'PROPOSAL_NOT_APPROVABLE' ? 409 : 400).json({ error: msg });
    }
  });

  return router;
}
