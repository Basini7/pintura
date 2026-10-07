import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { IRepository } from './repository.js';
import {
  Proposal,
  ProviderProfile,
  PlanTier,
  UserSubscription,
  User,
  StoredUser,
  AuthResponse,
  ProposalApprovalContext
} from '../types/domain.js';
import { PLANS_CONFIG } from './jsonRepository.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  isValidEmail,
  validatePassword
} from '../utils/auth.js';
import { generatePublicProposalToken, hashProposalContent } from '../utils/proposalSecurity.js';

export class SupabaseRepository implements IRepository {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  async checkConnection(): Promise<void> {
    const { error } = await this.client.from('users').select('id').limit(1);
    if (error) throw new Error(`Falha ao conectar ao Supabase: ${error.message}`);
  }

  async claimWebhookEvent(eventId: string): Promise<'claimed' | 'processed' | 'processing'> {
    const { error } = await this.client.from('webhook_events').insert({ event_id: eventId, status: 'PROCESSING' });
    if (!error) return 'claimed';
    if (error.code !== '23505') throw new Error(`Falha ao registrar evento webhook: ${error.message}`);
    const { data, error: readError } = await this.client.from('webhook_events').select('status, updated_at').eq('event_id', eventId).maybeSingle();
    if (readError) throw new Error(`Falha ao consultar evento webhook: ${readError.message}`);
    if (data?.status === 'PROCESSED') return 'processed';
    if (!data || new Date(data.updated_at).getTime() >= Date.now() - 5 * 60 * 1000) return 'processing';
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: reclaimed, error: reclaimError } = await this.client.from('webhook_events')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('status', 'PROCESSING')
      .lt('updated_at', cutoff)
      .select('event_id')
      .maybeSingle();
    if (reclaimError) throw new Error(`Falha ao recuperar evento webhook: ${reclaimError.message}`);
    return reclaimed ? 'claimed' : 'processing';
  }

  async completeWebhookEvent(eventId: string): Promise<void> {
    const { error } = await this.client.from('webhook_events').update({ status: 'PROCESSED', updated_at: new Date().toISOString() }).eq('event_id', eventId);
    if (error) throw new Error(`Falha ao concluir evento webhook: ${error.message}`);
  }

  async releaseWebhookEvent(eventId: string): Promise<void> {
    const { error } = await this.client.from('webhook_events').delete().eq('event_id', eventId).eq('status', 'PROCESSING');
    if (error) throw new Error(`Falha ao liberar evento webhook: ${error.message}`);
  }

  // --- USUÁRIOS E AUTENTICAÇÃO ---

  async registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
    if (!name || name.trim().length < 2) {
      throw new Error('Nome deve conter ao menos 2 caracteres.');
    }
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!isValidEmail(cleanEmail)) {
      throw new Error('E-mail informado é inválido.');
    }
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.valid) {
      throw new Error(pwdValidation.error);
    }

    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const { hash, salt } = await hashPassword(password);
    const userId = randomUUID();
    const now = new Date().toISOString();

    const { error: insertUserError } = await this.client.from('users').insert({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: hash,
      salt,
      created_at: now,
    });

    if (insertUserError) {
      throw new Error(`Falha ao cadastrar usuário: ${insertUserError.message}`);
    }

    // Criar perfil padrão
    const userProfile: ProviderProfile = {
      companyName: `${name.trim()} Pinturas & Acabamentos`,
      contactName: name.trim(),
      phones: [],
      address: '',
    };
    await this.updateProfile(userProfile, userId);

    // Criar sessão de 30 dias
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.client.from('sessions').insert({
      token: hashSessionToken(token),
      user_id: userId,
      created_at: now,
      expires_at: expiresAt,
    });

    const subscription = await this.getSubscription(userId);

    const publicUser: User = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      createdAt: now,
    };

    return {
      user: publicUser,
      token,
      profile: userProfile,
      subscription,
    };
  }

  async loginUser(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    const user = await this.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash, user.salt);
    if (!passwordMatch) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const token = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.client.from('sessions').insert({
      token: hashSessionToken(token),
      user_id: user.id,
      created_at: now,
      expires_at: expiresAt,
    });

    const profile = await this.getProfile(user.id);
    const subscription = await this.getSubscription(user.id);

    const publicUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    return {
      user: publicUser,
      token,
      profile,
      subscription,
    };
  }

  async getUserByToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;

    const { data: session, error } = await this.client
      .from('sessions')
      .select('token, user_id, expires_at')
      .eq('token', hashSessionToken(token))
      .maybeSingle();

    if (error || !session) return undefined;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await this.deleteSession(token);
      return undefined;
    }

    return this.getUserById(session.user_id);
  }

  async deleteSession(token: string): Promise<boolean> {
    const { error } = await this.client.from('sessions').delete().eq('token', hashSessionToken(token));
    return !error;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await this.client
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      createdAt: data.created_at,
    };
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) return undefined;

    const { data, error } = await this.client
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.password_hash,
      salt: data.salt,
      createdAt: data.created_at,
    };
  }

  // --- UPGRADES PENDENTES DA KIWIFY ---

  async savePendingUpgrade(email: string, planId: PlanTier): Promise<void> {
    const clean = email.trim().toLowerCase();
    await this.client.from('pending_upgrades').upsert({
      email: clean,
      plan_id: planId,
      created_at: new Date().toISOString(),
    });
  }

  async getPendingUpgrade(email: string): Promise<PlanTier | undefined> {
    const clean = email.trim().toLowerCase();
    const { data, error } = await this.client
      .from('pending_upgrades')
      .select('plan_id')
      .eq('email', clean)
      .maybeSingle();

    if (error || !data) return undefined;
    return data.plan_id as PlanTier;
  }

  async removePendingUpgrade(email: string): Promise<void> {
    const clean = email.trim().toLowerCase();
    await this.client.from('pending_upgrades').delete().eq('email', clean);
  }

  async activateSubscriptionByEmail(email: string, planId: PlanTier): Promise<UserSubscription> {
    const clean = email.trim().toLowerCase();
    const user = await this.getUserByEmail(clean);
    if (!user) {
      await this.savePendingUpgrade(clean, planId);
      const config = PLANS_CONFIG[planId] || PLANS_CONFIG.pro;
      return {
        planId,
        status: 'ACTIVE',
        currentCycleStart: new Date().toISOString(),
        usedProposalsCount: 0,
        monthlyLimit: config.monthlyLimit,
        hasWatermark: config.hasWatermark,
      };
    }
    return this.upgradeSubscription(planId, user.id);
  }

  async cancelSubscriptionByEmail(email: string): Promise<boolean> {
    const clean = email.trim().toLowerCase();
    const user = await this.getUserByEmail(clean);
    if (!user) {
      await this.removePendingUpgrade(clean);
      return false;
    }
    await this.upgradeSubscription('free', user.id);
    return true;
  }

  // --- PERFIL ---

  async getProfile(userId?: string): Promise<ProviderProfile> {
    const defaultProfile: ProviderProfile = {
      companyName: 'Pintura & Acabamentos Residenciais',
      contactName: 'Profissional da Pintura',
      phones: [],
      address: '',
      pixKey: '',
    };

    if (!userId) return defaultProfile;

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      await this.updateProfile(defaultProfile, userId);
      return defaultProfile;
    }

    return {
      companyName: data.company_name,
      contactName: data.contact_name || undefined,
      phones: data.phones || [],
      address: data.address || '',
      pixKey: data.pix_key || '',
    };
  }

  async updateProfile(profile: ProviderProfile, userId?: string): Promise<ProviderProfile> {
    if (!userId) return profile;

    await this.client.from('profiles').upsert({
      user_id: userId,
      company_name: profile.companyName,
      contact_name: profile.contactName || null,
      phones: profile.phones || [],
      address: profile.address || '',
      pix_key: profile.pixKey || null,
      updated_at: new Date().toISOString(),
    });

    return profile;
  }

  // --- PROPOSTAS ---

  async listProposals(userId: string): Promise<Proposal[]> {
    const { data, error } = await this.client
      .from('proposals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map((row) => this.mapProposalRow(row));
  }

  async getProposalById(id: string, userId: string): Promise<Proposal | undefined> {
    const { data, error } = await this.client
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return undefined;
    return this.mapProposalRow(data);
  }

  async getPublicProposalByToken(token: string): Promise<Proposal | undefined> {
    const { data, error } = await this.client.from('proposals').select('*').eq('public_token', token).maybeSingle();
    if (error || !data) return undefined;
    return this.mapProposalRow(data);
  }

  async saveProposal(proposal: Proposal, userId: string): Promise<Proposal> {
    const id = proposal.id || randomUUID();
    const existing = await this.getProposalById(id, userId);
    const now = new Date().toISOString();

    const { count } = await this.client.from('proposals').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const totalCount = count || 0;

    const targetUserId = userId;
    const publicToken = existing?.publicToken || proposal.publicToken || generatePublicProposalToken();
    const proposalNumber = proposal.proposalNumber || existing?.proposalNumber || this.generateNumber(totalCount + 1);

    const rowData = {
      id,
      user_id: targetUserId || null,
      public_token: publicToken,
      proposal_number: proposalNumber,
      status: proposal.status || 'DRAFT',
      client: proposal.client,
      areas: proposal.areas,
      pricing: proposal.pricing,
      terms: proposal.terms,
      view_count: proposal.viewCount || 0,
      viewed_at: proposal.viewedAt ? new Date(proposal.viewedAt).toISOString() : null,
      approved_at: proposal.approvedAt ? new Date(proposal.approvedAt).toISOString() : null,
      signer_name: proposal.signerName || null,
      signature: proposal.signature || null,
      signer_ip: proposal.signerIp || null,
      signer_user_agent: proposal.signerUserAgent || null,
      signed_content_hash: proposal.signedContentHash || null,
      created_at: existing ? existing.createdAt : (proposal.createdAt || now),
      updated_at: now,
    };

    if (existing?.status === 'APPROVED') throw new Error('PROPOSAL_ALREADY_APPROVED');
    const result = existing
      ? await this.client.from('proposals').update(rowData).eq('id', id).eq('user_id', userId).neq('status', 'APPROVED').select('id')
      : await this.client.from('proposals').insert(rowData);
    const { error } = result;
    if (error) {
      throw new Error(`Falha ao salvar proposta: ${error.message}`);
    }
    if (existing && !result.data?.length) throw new Error('PROPOSAL_ALREADY_APPROVED');

    const saved = await this.getProposalById(id, userId);
    return saved || proposal;
  }

  async deleteProposal(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client.from('proposals').delete().eq('id', id).eq('user_id', userId).select('id');
    return !error && Boolean(data?.length);
  }

  async duplicateProposal(id: string, newClientName: string | undefined, userId: string): Promise<Proposal | undefined> {
    const original = await this.getProposalById(id, userId);
    if (!original) return undefined;

    const { count } = await this.client.from('proposals').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const totalCount = count || 0;

    const duplicated: Proposal = {
      ...original,
      id: randomUUID(),
      userId,
      publicToken: generatePublicProposalToken(),
      proposalNumber: this.generateNumber(totalCount + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'DRAFT',
      client: {
        ...original.client,
        name: newClientName || `${original.client.name} (Cópia)`,
      },
      viewCount: 0,
      viewedAt: undefined,
      approvedAt: undefined,
      signerName: undefined,
      signature: undefined,
    };

    return this.saveProposal(duplicated, userId);
  }

  async trackViewByPublicToken(token: string): Promise<Proposal | undefined> {
    const proposal = await this.getPublicProposalByToken(token);
    if (!proposal?.userId) return undefined;

    proposal.viewCount = (proposal.viewCount || 0) + 1;
    proposal.viewedAt = new Date().toISOString();
    if (proposal.status === 'DRAFT') {
      proposal.status = 'SENT';
    }
    return this.saveProposal(proposal, proposal.userId);
  }

  async approveProposalByPublicToken(token: string, signerName: string, signature: string, context: ProposalApprovalContext): Promise<Proposal | undefined> {
    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      throw new Error('Nome do signatário inválido (mínimo de 2 caracteres).');
    }
    if (signerName.length > 100) {
      throw new Error('Nome do signatário excede o limite permitido.');
    }
    if (!signature || typeof signature !== 'string') {
      throw new Error('Assinatura digital é obrigatória.');
    }
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(signature)) {
      throw new Error('Formato da imagem de assinatura inválido. Deve ser imagem Base64 válida.');
    }
    if (signature.length > 700000) {
      throw new Error('Tamanho da assinatura digital excede o limite máximo permitido (500 KB).');
    }

    const proposal = await this.getPublicProposalByToken(token);
    if (!proposal) return undefined;
    if (proposal.status !== 'SENT' || !proposal.userId) throw new Error('PROPOSAL_NOT_APPROVABLE');
    const contentHash = hashProposalContent(proposal);
    const approvedAt = new Date().toISOString();
    const { data, error } = await this.client.from('proposals').update({
      status: 'APPROVED',
      approved_at: approvedAt,
      signer_name: signerName.trim(),
      signature,
      signer_ip: context.ip || null,
      signer_user_agent: context.userAgent || null,
      signed_content_hash: contentHash,
      updated_at: approvedAt,
    }).eq('public_token', token).eq('user_id', proposal.userId).eq('status', 'SENT').select('*').maybeSingle();
    if (error || !data) throw new Error('PROPOSAL_NOT_APPROVABLE');
    return this.mapProposalRow(data);
  }

  // --- ASSINATURAS E QUOTAS ---

  async getSubscription(userId?: string): Promise<UserSubscription> {
    let planId: PlanTier = 'free';
    let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE';
    let currentCycleStart = new Date().toISOString();

    if (userId) {
      const { data, error } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        await this.client.from('subscriptions').insert({
          user_id: userId,
          plan_id: 'free',
          status: 'ACTIVE',
          current_cycle_start: currentCycleStart,
          updated_at: currentCycleStart,
        });
      } else {
        planId = data.plan_id as PlanTier;
        status = data.status;
        currentCycleStart = data.current_cycle_start;
      }
    }

    const config = PLANS_CONFIG[planId] || PLANS_CONFIG.free;
    const proposals = userId ? await this.listProposals(userId) : [];

    let usedCount = 0;
    if (planId === 'free') {
      usedCount = proposals.length;
    } else {
      const cycleStart = new Date(currentCycleStart).getTime();
      usedCount = proposals.filter((p) => new Date(p.createdAt).getTime() >= cycleStart).length;
    }

    return {
      planId,
      status,
      currentCycleStart,
      usedProposalsCount: usedCount,
      monthlyLimit: config.monthlyLimit,
      hasWatermark: config.hasWatermark,
    };
  }

  async checkQuota(userId: string): Promise<{ allowed: boolean; subscription: UserSubscription; message?: string }> {
    const sub = await this.getSubscription(userId);
    if (sub.monthlyLimit !== -1 && sub.usedProposalsCount >= sub.monthlyLimit) {
      const planName = PLANS_CONFIG[sub.planId]?.name || sub.planId;
      return {
        allowed: false,
        subscription: sub,
        message: `Limite de ${sub.monthlyLimit} proposta(s) atingido no plano ${planName}. Faça upgrade para continuar criando orçamentos sem travas!`,
      };
    }
    return {
      allowed: true,
      subscription: sub,
    };
  }

  async upgradeSubscription(newPlanId: PlanTier, userId?: string): Promise<UserSubscription> {
    if (!PLANS_CONFIG[newPlanId]) {
      throw new Error(`Plano inválido: "${newPlanId}".`);
    }

    if (userId) {
      await this.client.from('subscriptions').upsert({
        user_id: userId,
        plan_id: newPlanId,
        status: 'ACTIVE',
        current_cycle_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return this.getSubscription(userId);
  }

  private generateNumber(seq: number): string {
    const year = new Date().getFullYear();
    const formattedSeq = String(seq).padStart(3, '0');
    return `PROP-${year}-${formattedSeq}`;
  }

  private mapProposalRow(row: any): Proposal {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      proposalNumber: row.proposal_number,
      status: row.status,
      client: typeof row.client === 'string' ? JSON.parse(row.client) : row.client,
      areas: typeof row.areas === 'string' ? JSON.parse(row.areas) : row.areas,
      pricing: typeof row.pricing === 'string' ? JSON.parse(row.pricing) : row.pricing,
      terms: typeof row.terms === 'string' ? JSON.parse(row.terms) : row.terms,
      viewCount: row.view_count || 0,
      viewedAt: row.viewed_at || undefined,
      approvedAt: row.approved_at || undefined,
      signerName: row.signer_name || undefined,
      signature: row.signature || undefined,
      publicToken: row.public_token || undefined,
      signerIp: row.signer_ip || undefined,
      signerUserAgent: row.signer_user_agent || undefined,
      signedContentHash: row.signed_content_hash || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}
