import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Proposal, ProposalApprovalContext, ProviderProfile, PlanTier, PlanConfig, UserSubscription, User, StoredUser, UserSession, AuthResponse } from '../types/domain.js';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken, isValidEmail, validatePassword } from '../utils/auth.js';
import { generatePublicProposalToken, hashProposalContent } from '../utils/proposalSecurity.js';

export const PLANS_CONFIG: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Degustação Gratuita',
    price: 0,
    monthlyLimit: 1,
    hasWatermark: true,
    prioritySupport: false,
  },
  basic: {
    id: 'basic',
    name: 'Plano Básico',
    price: 38,
    monthlyLimit: 4,
    hasWatermark: true,
    prioritySupport: false,
  },
  intermediate: {
    id: 'intermediate',
    name: 'Plano Intermediário',
    price: 47,
    monthlyLimit: 12,
    hasWatermark: true,
    prioritySupport: false,
  },
  pro: {
    id: 'pro',
    name: 'Plano Pro Ilimitado',
    price: 59,
    monthlyLimit: -1,
    hasWatermark: false,
    prioritySupport: true,
  },
};

interface StoredSubscriptionData {
  planId: PlanTier;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentCycleStart: string;
}

import { IRepository } from './repository.js';

export class JsonRepository implements IRepository {
  private dataDir: string;
  private proposalsFile: string;
  private profileFile: string;
  private subscriptionFile: string;
  private usersFile: string;
  private sessionsFile: string;
  private profilesFile: string;
  private subscriptionsFile: string;
  private pendingUpgradesFile: string;
  private approvalLock: Promise<void> = Promise.resolve();
  private webhookEventLock: Promise<void> = Promise.resolve();

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir || path.resolve(process.cwd(), 'data');
    this.proposalsFile = path.join(this.dataDir, 'proposals.json');
    this.profileFile = path.join(this.dataDir, 'profile.json');
    this.subscriptionFile = path.join(this.dataDir, 'subscription.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.profilesFile = path.join(this.dataDir, 'profiles.json');
    this.subscriptionsFile = path.join(this.dataDir, 'subscriptions.json');
    this.pendingUpgradesFile = path.join(this.dataDir, 'pending_upgrades.json');
  }

  async claimWebhookEvent(eventId: string): Promise<'claimed' | 'processed' | 'processing'> {
    let releaseLock!: () => void;
    const previous = this.webhookEventLock;
    this.webhookEventLock = new Promise<void>((resolve) => { releaseLock = resolve; });
    await previous;
    try {
      await this.ensureDir();
      const filePath = path.join(this.dataDir, 'webhook_events.json');
      const events: Record<string, string> = await fs.readFile(filePath, 'utf-8')
        .then((content) => JSON.parse(content) as Record<string, string>)
        .catch(() => ({} as Record<string, string>));
      if (events[eventId] === 'PROCESSED') return 'processed';
      const processingStartedAt = Number(events[eventId]?.split(':')[1]);
      if (events[eventId]?.startsWith('PROCESSING:') && Date.now() - processingStartedAt < 5 * 60 * 1000) {
        return 'processing';
      }
      events[eventId] = `PROCESSING:${Date.now()}`;
      await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf-8');
      return 'claimed';
    } finally {
      releaseLock();
    }
  }

  async completeWebhookEvent(eventId: string): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.dataDir, 'webhook_events.json');
    const events: Record<string, string> = await fs.readFile(filePath, 'utf-8')
      .then((content) => JSON.parse(content) as Record<string, string>)
      .catch(() => ({} as Record<string, string>));
    events[eventId] = 'PROCESSED';
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf-8');
  }

  async releaseWebhookEvent(eventId: string): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(this.dataDir, 'webhook_events.json');
    const events: Record<string, string> = await fs.readFile(filePath, 'utf-8')
      .then((content) => JSON.parse(content) as Record<string, string>)
      .catch(() => ({} as Record<string, string>));
    delete events[eventId];
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf-8');
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  // --- AUTHENTICATION & USERS ---
  private async readUsers(): Promise<StoredUser[]> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.usersFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async writeUsers(users: StoredUser[]): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), 'utf-8');
  }

  private async readSessions(): Promise<UserSession[]> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.sessionsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async writeSessions(sessions: UserSession[]): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2), 'utf-8');
  }

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

    const users = await this.readUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('Este e-mail já está cadastrado.');
    }

    const { hash, salt } = await hashPassword(password);
    const userId = randomUUID();
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      createdAt: now,
      passwordHash: hash,
      salt,
    };

    users.push(newUser);
    await this.writeUsers(users);

    // Criar perfil padrão para o novo pintor
    const userProfile: ProviderProfile = {
      companyName: `${name.trim()} Pinturas & Acabamentos`,
      contactName: name.trim(),
      phones: [],
      address: '',
    };
    await this.updateProfile(userProfile, userId);

    // Criar sessão (válida por 30 dias)
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = await this.readSessions();
    sessions.push({
      token: hashSessionToken(token),
      userId,
      createdAt: now,
      expiresAt,
    });
    await this.writeSessions(sessions);

    const subscription = await this.getSubscription(userId);

    const publicUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
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

    const users = await this.readUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash, user.salt);
    if (!passwordMatch) {
      throw new Error('E-mail ou senha incorretos.');
    }

    // Criar nova sessão
    const token = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessions = await this.readSessions();
    sessions.push({
      token: hashSessionToken(token),
      userId: user.id,
      createdAt: now,
      expiresAt,
    });
    await this.writeSessions(sessions);

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
    const sessions = await this.readSessions();
    const tokenHash = hashSessionToken(token);
    const session = sessions.find((s) => s.token === tokenHash);
    if (!session) return undefined;

    // Verificar expiração
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      // Sessão expirada, remover
      await this.deleteSession(token);
      return undefined;
    }

    const users = await this.readUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) return undefined;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async deleteSession(token: string): Promise<boolean> {
    const sessions = await this.readSessions();
    const tokenHash = hashSessionToken(token);
    const filtered = sessions.filter((s) => s.token !== tokenHash);
    if (filtered.length === sessions.length) return false;
    await this.writeSessions(filtered);
    return true;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.readUsers();
    const user = users.find((u) => u.id === id);
    if (!user) return undefined;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) return undefined;
    const users = await this.readUsers();
    return users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  // --- UPGRADES PENDENTES (PAGAMENTO ANTES DO CADASTRO) ---
  private async readPendingUpgrades(): Promise<Record<string, PlanTier>> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.pendingUpgradesFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async writePendingUpgrades(map: Record<string, PlanTier>): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.pendingUpgradesFile, JSON.stringify(map, null, 2), 'utf-8');
  }

  async savePendingUpgrade(email: string, planId: PlanTier): Promise<void> {
    const clean = email.trim().toLowerCase();
    const map = await this.readPendingUpgrades();
    map[clean] = planId;
    await this.writePendingUpgrades(map);
  }

  async getPendingUpgrade(email: string): Promise<PlanTier | undefined> {
    const clean = email.trim().toLowerCase();
    const map = await this.readPendingUpgrades();
    return map[clean];
  }

  async removePendingUpgrade(email: string): Promise<void> {
    const clean = email.trim().toLowerCase();
    const map = await this.readPendingUpgrades();
    if (map[clean]) {
      delete map[clean];
      await this.writePendingUpgrades(map);
    }
  }

  async activateSubscriptionByEmail(email: string, planId: PlanTier): Promise<UserSubscription> {
    const clean = email.trim().toLowerCase();
    const user = await this.getUserByEmail(clean);
    if (!user) {
      // Guarda ativação pendente para quando o usuário se cadastrar
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

  // --- PROFILE ---
  private async readProfilesMap(): Promise<Record<string, ProviderProfile>> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.profilesFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async writeProfilesMap(map: Record<string, ProviderProfile>): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.profilesFile, JSON.stringify(map, null, 2), 'utf-8');
  }

  async getProfile(userId?: string): Promise<ProviderProfile> {
    await this.ensureDir();
    if (userId) {
      const map = await this.readProfilesMap();
      if (map[userId]) {
        return map[userId];
      }
    }

    try {
      const content = await fs.readFile(this.profileFile, 'utf-8');
      return JSON.parse(content) as ProviderProfile;
    } catch {
      const defaultProfile: ProviderProfile = {
        companyName: 'Pintura & Acabamentos Residenciais',
        contactName: 'Profissional da Pintura',
        phones: [],
        address: '',
        pixKey: '',
      };
      await this.updateProfile(defaultProfile, userId);
      return defaultProfile;
    }
  }

  async updateProfile(profile: ProviderProfile, userId?: string): Promise<ProviderProfile> {
    await this.ensureDir();
    if (userId) {
      const map = await this.readProfilesMap();
      map[userId] = profile;
      await this.writeProfilesMap(map);
    }
    // Salvar também no arquivo padrão para retrocompatibilidade
    await fs.writeFile(this.profileFile, JSON.stringify(profile, null, 2), 'utf-8');
    return profile;
  }

  // --- PROPOSALS ---
  async listProposals(userId: string): Promise<Proposal[]> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.proposalsFile, 'utf-8');
      const list = JSON.parse(content) as Proposal[];
      const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted.filter((proposal) => proposal.userId === userId);
    } catch {
      return [];
    }
  }

  async getProposalById(id: string, userId: string): Promise<Proposal | undefined> {
    const list = await this.listProposals(userId);
    const proposal = list.find((p) => p.id === id);
    return proposal;
  }

  async getPublicProposalByToken(token: string): Promise<Proposal | undefined> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.proposalsFile, 'utf-8');
      const list = JSON.parse(content) as Proposal[];
      return list.find((proposal) => proposal.publicToken === token);
    } catch {
      return undefined;
    }
  }

  async saveProposal(proposal: Proposal, userId: string): Promise<Proposal> {
    await this.ensureDir();
    const content = await fs.readFile(this.proposalsFile, 'utf-8').catch(() => '[]');
    const list = JSON.parse(content) as Proposal[];
    const id = proposal.id || randomUUID();
    const existingIndex = list.findIndex((item) => item.id === id && item.userId === userId);
    if (list.some((item) => item.id === id && item.userId !== userId)) {
      throw new Error('Não autorizado a alterar proposta de outro usuário.');
    }
    if (existingIndex >= 0 && list[existingIndex].status === 'APPROVED') {
      throw new Error('PROPOSAL_ALREADY_APPROVED');
    }

    const now = new Date().toISOString();
    const updatedProposal: Proposal = {
      ...proposal,
      id,
      userId,
      publicToken: proposal.publicToken || generatePublicProposalToken(),
      updatedAt: now,
      createdAt: proposal.createdAt || now,
      proposalNumber: proposal.proposalNumber || this.generateNumber(list.filter((item) => item.userId === userId).length + 1),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updatedProposal;
    } else {
      list.push(updatedProposal);
    }

    await fs.writeFile(this.proposalsFile, JSON.stringify(list, null, 2), 'utf-8');
    return updatedProposal;
  }

  async deleteProposal(id: string, userId: string): Promise<boolean> {
    await this.ensureDir();
    const content = await fs.readFile(this.proposalsFile, 'utf-8').catch(() => '[]');
    const list = JSON.parse(content) as Proposal[];
    const target = list.find((proposal) => proposal.id === id && proposal.userId === userId);
    if (!target) return false;

    const filtered = list.filter((proposal) => proposal.id !== id || proposal.userId !== userId);
    await fs.writeFile(this.proposalsFile, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }

  async duplicateProposal(id: string, newClientName: string | undefined, userId: string): Promise<Proposal | undefined> {
    const original = await this.getProposalById(id, userId);
    if (!original) return undefined;

    const list = await this.listProposals(userId);
    const duplicated: Proposal = {
      ...original,
      id: randomUUID(),
      userId,
      publicToken: generatePublicProposalToken(),
      proposalNumber: this.generateNumber(list.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'DRAFT',
      client: {
        ...original.client,
        name: newClientName || `${original.client.name} (Cópia)`,
      },
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

  async approveProposalByPublicToken(
    token: string,
    signerName: string,
    signature: string,
    context: ProposalApprovalContext
  ): Promise<Proposal | undefined> {
    let releaseLock!: () => void;
    const previousApproval = this.approvalLock;
    this.approvalLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    await previousApproval;

    try {
    // Validação estrita de segurança da assinatura
    if (!signerName || typeof signerName !== 'string' || signerName.trim().length < 2) {
      throw new Error('Nome do signatário inválido (mínimo de 2 caracteres).');
    }
    if (signerName.length > 100) {
      throw new Error('Nome do signatário excede o limite permitido.');
    }
    if (!signature || typeof signature !== 'string') {
      throw new Error('Assinatura digital é obrigatória.');
    }
    // Validar formato Base64 de imagem (PNG, JPEG, WEBP)
    const base64Regex = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(signature)) {
      throw new Error('Formato da imagem de assinatura inválido. Deve ser imagem Base64 válida.');
    }
    // Limitar tamanho a ~500KB (aproximadamente 700.000 caracteres base64)
    if (signature.length > 700000) {
      throw new Error('Tamanho da assinatura digital excede o limite máximo permitido (500 KB).');
    }

    const proposal = await this.getPublicProposalByToken(token);
    if (!proposal) return undefined;
    if (proposal.status !== 'SENT' || !proposal.userId) {
      throw new Error('PROPOSAL_NOT_APPROVABLE');
    }

    const proposals = await this.listAllProposals();
    const current = proposals.find((item) => item.id === proposal.id && item.userId === proposal.userId);
    if (!current || current.status !== 'SENT') {
      throw new Error('PROPOSAL_NOT_APPROVABLE');
    }

    const contentHash = hashProposalContent(current);
    proposal.status = 'APPROVED';
    proposal.approvedAt = new Date().toISOString();
    proposal.signerName = signerName.trim();
    proposal.signature = signature;
    proposal.signerIp = context.ip;
    proposal.signerUserAgent = context.userAgent;
    proposal.signedContentHash = contentHash;
    return this.saveProposal(proposal, proposal.userId);
    } finally {
      releaseLock();
    }
  }

  private async listAllProposals(): Promise<Proposal[]> {
    await this.ensureDir();
    try {
      return JSON.parse(await fs.readFile(this.proposalsFile, 'utf-8')) as Proposal[];
    } catch {
      return [];
    }
  }

  // --- SUBSCRIPTIONS & QUOTA ENFORCEMENT ---
  private async readSubscriptionsMap(): Promise<Record<string, StoredSubscriptionData>> {
    await this.ensureDir();
    try {
      const content = await fs.readFile(this.subscriptionsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async writeSubscriptionsMap(map: Record<string, StoredSubscriptionData>): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(this.subscriptionsFile, JSON.stringify(map, null, 2), 'utf-8');
  }

  async getSubscription(userId?: string): Promise<UserSubscription> {
    await this.ensureDir();
    let stored: StoredSubscriptionData;

    if (userId) {
      const map = await this.readSubscriptionsMap();
      if (map[userId]) {
        stored = map[userId];
      } else {
        stored = {
          planId: 'free',
          status: 'ACTIVE',
          currentCycleStart: new Date().toISOString(),
        };
        map[userId] = stored;
        await this.writeSubscriptionsMap(map);
      }
    } else {
      try {
        const content = await fs.readFile(this.subscriptionFile, 'utf-8');
        stored = JSON.parse(content);
      } catch {
        stored = {
          planId: 'free',
          status: 'ACTIVE',
          currentCycleStart: new Date().toISOString(),
        };
        await fs.writeFile(this.subscriptionFile, JSON.stringify(stored, null, 2), 'utf-8');
      }
    }

    const config = PLANS_CONFIG[stored.planId] || PLANS_CONFIG.free;
    const proposals = userId ? await this.listProposals(userId) : [];

    let usedCount = 0;
    if (stored.planId === 'free') {
      usedCount = proposals.length;
    } else {
      const cycleStart = new Date(stored.currentCycleStart).getTime();
      usedCount = proposals.filter((p) => new Date(p.createdAt).getTime() >= cycleStart).length;
    }

    return {
      planId: stored.planId,
      status: stored.status,
      currentCycleStart: stored.currentCycleStart,
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
    await this.ensureDir();
    if (!PLANS_CONFIG[newPlanId]) {
      throw new Error(`Plano inválido: "${newPlanId}".`);
    }

    const subData: StoredSubscriptionData = {
      planId: newPlanId,
      status: 'ACTIVE',
      currentCycleStart: new Date().toISOString(),
    };

    if (userId) {
      const map = await this.readSubscriptionsMap();
      map[userId] = subData;
      await this.writeSubscriptionsMap(map);
    }
    await fs.writeFile(this.subscriptionFile, JSON.stringify(subData, null, 2), 'utf-8');

    return this.getSubscription(userId);
  }

  private generateNumber(seq: number): string {
    const year = new Date().getFullYear();
    const formattedSeq = String(seq).padStart(3, '0');
    return `PROP-${year}-${formattedSeq}`;
  }
}
