import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IRepository } from './repository.js';
import {
  Proposal,
  ProviderProfile,
  PlanTier,
  UserSubscription,
  User,
  StoredUser,
  AuthResponse
} from '../types/domain.js';
import { PLANS_CONFIG } from './jsonRepository.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  isValidEmail,
  validatePassword
} from '../utils/auth.js';

export class SupabaseRepository implements IRepository {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
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

    const { hash, salt } = hashPassword(password);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      phones: ['(11) 99999-9999'],
      address: 'Atendimento em toda a região',
    };
    await this.updateProfile(userProfile, userId);

    // Criar sessão de 30 dias
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.client.from('sessions').insert({
      token,
      user_id: userId,
      created_at: now,
      expires_at: expiresAt,
    });

    // Se houver compra pendente da Kiwify, ativa automaticamente
    const pendingPlan = await this.getPendingUpgrade(cleanEmail);
    if (pendingPlan) {
      await this.upgradeSubscription(pendingPlan, userId);
      await this.removePendingUpgrade(cleanEmail);
    }

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

    const passwordMatch = verifyPassword(password, user.passwordHash, user.salt);
    if (!passwordMatch) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const token = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await this.client.from('sessions').insert({
      token,
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
      .eq('token', token)
      .maybeSingle();

    if (error || !session) return undefined;

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await this.deleteSession(token);
      return undefined;
    }

    return this.getUserById(session.user_id);
  }

  async deleteSession(token: string): Promise<boolean> {
    const { error } = await this.client.from('sessions').delete().eq('token', token);
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
      phones: ['(11) 99999-9999'],
      address: 'Atendimento em toda a região',
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

  async listProposals(userId?: string): Promise<Proposal[]> {
    let query = this.client.from('proposals').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => this.mapProposalRow(row));
  }

  async getProposalById(id: string, userId?: string): Promise<Proposal | undefined> {
    const { data, error } = await this.client
      .from('proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return undefined;
    const proposal = this.mapProposalRow(data);

    if (userId && proposal.userId && proposal.userId !== userId) {
      return undefined;
    }
    return proposal;
  }

  async saveProposal(proposal: Proposal, userId?: string): Promise<Proposal> {
    const existing = await this.getProposalById(proposal.id);
    const now = new Date().toISOString();

    const { count } = await this.client.from('proposals').select('*', { count: 'exact', head: true });
    const totalCount = count || 0;

    const targetUserId = userId || proposal.userId || existing?.userId;
    const proposalNumber = proposal.proposalNumber || existing?.proposalNumber || this.generateNumber(totalCount + 1);

    if (existing && userId && existing.userId && existing.userId !== userId) {
      throw new Error('Não autorizado a alterar proposta de outro usuário.');
    }

    const rowData = {
      id: proposal.id,
      user_id: targetUserId || null,
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
      created_at: existing ? existing.createdAt : (proposal.createdAt || now),
      updated_at: now,
    };

    const { error } = await this.client.from('proposals').upsert(rowData);
    if (error) {
      throw new Error(`Falha ao salvar proposta: ${error.message}`);
    }

    const saved = await this.getProposalById(proposal.id);
    return saved || proposal;
  }

  async deleteProposal(id: string, userId?: string): Promise<boolean> {
    const existing = await this.getProposalById(id);
    if (!existing) return false;
    if (userId && existing.userId && existing.userId !== userId) {
      return false;
    }
    const { error } = await this.client.from('proposals').delete().eq('id', id);
    return !error;
  }

  async duplicateProposal(id: string, newClientName?: string, userId?: string): Promise<Proposal | undefined> {
    const original = await this.getProposalById(id, userId);
    if (!original) return undefined;

    const { count } = await this.client.from('proposals').select('*', { count: 'exact', head: true });
    const totalCount = count || 0;

    const duplicated: Proposal = {
      ...original,
      id: `prop-${Date.now()}`,
      userId: userId || original.userId,
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

  async trackView(id: string): Promise<Proposal | undefined> {
    const proposal = await this.getProposalById(id);
    if (!proposal) return undefined;

    proposal.viewCount = (proposal.viewCount || 0) + 1;
    proposal.viewedAt = new Date().toISOString();
    if (proposal.status === 'DRAFT') {
      proposal.status = 'SENT';
    }
    return this.saveProposal(proposal, proposal.userId);
  }

  async approveProposal(id: string, signerName: string, signature: string): Promise<Proposal | undefined> {
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

    const proposal = await this.getProposalById(id);
    if (!proposal) return undefined;

    proposal.status = 'APPROVED';
    proposal.approvedAt = new Date().toISOString();
    proposal.signerName = signerName.trim();
    proposal.signature = signature;
    return this.saveProposal(proposal, proposal.userId);
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
    const proposals = await this.listProposals(userId);

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

  async checkQuota(userId?: string): Promise<{ allowed: boolean; subscription: UserSubscription; message?: string }> {
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
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}
