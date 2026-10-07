import pg from 'pg';
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

const { Pool } = pg;

export class PostgresRepository implements IRepository {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    const connStr = connectionString || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!connStr) {
      throw new Error('DATABASE_URL ou SUPABASE_DB_URL não foi definida.');
    }

    const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');

    this.pool = new Pool({
      connectionString: connStr,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Inicializa automaticamente as tabelas caso não existam no Supabase
   */
  async initSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          salt VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

        CREATE TABLE IF NOT EXISTS sessions (
          token VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

        CREATE TABLE IF NOT EXISTS profiles (
          user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          company_name VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255),
          phones TEXT[] NOT NULL DEFAULT '{}',
          address TEXT DEFAULT '',
          pix_key VARCHAR(255),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS proposals (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          proposal_number VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
          client JSONB NOT NULL DEFAULT '{}'::jsonb,
          areas JSONB NOT NULL DEFAULT '[]'::jsonb,
          pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
          terms JSONB NOT NULL DEFAULT '{}'::jsonb,
          view_count INT NOT NULL DEFAULT 0,
          viewed_at TIMESTAMPTZ,
          approved_at TIMESTAMPTZ,
          signer_name VARCHAR(255),
          signature TEXT,
          public_token VARCHAR(128) UNIQUE,
          signer_ip VARCHAR(128),
          signer_user_agent TEXT,
          signed_content_hash VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE proposals ADD COLUMN IF NOT EXISTS public_token VARCHAR(128) UNIQUE;
        ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(128);
        ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;
        ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signed_content_hash VARCHAR(64);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_public_token ON proposals(public_token) WHERE public_token IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
        CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

        CREATE TABLE IF NOT EXISTS subscriptions (
          user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          plan_id VARCHAR(32) NOT NULL DEFAULT 'free',
          status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
          current_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS pending_upgrades (
          email VARCHAR(255) PRIMARY KEY,
          plan_id VARCHAR(32) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS webhook_events (
          event_id VARCHAR(128) PRIMARY KEY,
          status VARCHAR(16) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
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

    await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash, salt, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, name.trim(), cleanEmail, hash, salt, now]
    );

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
    await this.pool.query(
      `INSERT INTO sessions (token, user_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [hashSessionToken(token), userId, now, expiresAt]
    );

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

    await this.pool.query(
      `INSERT INTO sessions (token, user_id, created_at, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [hashSessionToken(token), user.id, now, expiresAt]
    );

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

    const res = await this.pool.query(
      `SELECT u.id, u.name, u.email, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1`,
      [hashSessionToken(token)]
    );

    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await this.deleteSession(token);
      return undefined;
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  async deleteSession(token: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM sessions WHERE token = $1', [hashSessionToken(token)]);
    return (res.rowCount ?? 0) > 0;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const res = await this.pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) return undefined;

    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (res.rows.length === 0) return undefined;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      salt: row.salt,
      createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  // --- UPGRADES PENDENTES DA KIWIFY ---

  async savePendingUpgrade(email: string, planId: PlanTier): Promise<void> {
    const clean = email.trim().toLowerCase();
    await this.pool.query(
      `INSERT INTO pending_upgrades (email, plan_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET plan_id = EXCLUDED.plan_id, created_at = NOW()`,
      [clean, planId]
    );
  }

  async getPendingUpgrade(email: string): Promise<PlanTier | undefined> {
    const clean = email.trim().toLowerCase();
    const res = await this.pool.query('SELECT plan_id FROM pending_upgrades WHERE email = $1', [clean]);
    if (res.rows.length === 0) return undefined;
    return res.rows[0].plan_id as PlanTier;
  }

  async removePendingUpgrade(email: string): Promise<void> {
    const clean = email.trim().toLowerCase();
    await this.pool.query('DELETE FROM pending_upgrades WHERE email = $1', [clean]);
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

    const res = await this.pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) {
      await this.updateProfile(defaultProfile, userId);
      return defaultProfile;
    }

    const row = res.rows[0];
    return {
      companyName: row.company_name,
      contactName: row.contact_name || undefined,
      phones: row.phones || [],
      address: row.address || '',
      pixKey: row.pix_key || '',
    };
  }

  async updateProfile(profile: ProviderProfile, userId?: string): Promise<ProviderProfile> {
    if (!userId) return profile;

    await this.pool.query(
      `INSERT INTO profiles (user_id, company_name, contact_name, phones, address, pix_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         contact_name = EXCLUDED.contact_name,
         phones = EXCLUDED.phones,
         address = EXCLUDED.address,
         pix_key = EXCLUDED.pix_key,
         updated_at = NOW()`,
      [
        userId,
        profile.companyName,
        profile.contactName || null,
        profile.phones || [],
        profile.address || '',
        profile.pixKey || null,
      ]
    );

    return profile;
  }

  // --- PROPOSTAS ---

  async listProposals(userId: string): Promise<Proposal[]> {
    const res = await this.pool.query('SELECT * FROM proposals WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows.map((row) => this.mapProposalRow(row));
  }

  async getProposalById(id: string, userId: string): Promise<Proposal | undefined> {
    const res = await this.pool.query('SELECT * FROM proposals WHERE id = $1 AND user_id = $2', [id, userId]);
    if (res.rows.length === 0) return undefined;
    return this.mapProposalRow(res.rows[0]);
  }

  async getPublicProposalByToken(token: string): Promise<Proposal | undefined> {
    const res = await this.pool.query('SELECT * FROM proposals WHERE public_token = $1', [token]);
    return res.rows[0] ? this.mapProposalRow(res.rows[0]) : undefined;
  }

  async saveProposal(proposal: Proposal, userId: string): Promise<Proposal> {
    const id = proposal.id || randomUUID();
    const existing = await this.getProposalById(id, userId);
    const now = new Date().toISOString();
    const countRes = await this.pool.query('SELECT COUNT(*) FROM proposals WHERE user_id = $1', [userId]);
    const totalCount = parseInt(countRes.rows[0].count, 10) || 0;

    const targetUserId = userId;
    const publicToken = existing?.publicToken || proposal.publicToken || generatePublicProposalToken();
    const proposalNumber = proposal.proposalNumber || existing?.proposalNumber || this.generateNumber(totalCount + 1);
    if (existing) {
      if (existing.status === 'APPROVED') throw new Error('PROPOSAL_ALREADY_APPROVED');
      const updated = await this.pool.query(
        `UPDATE proposals SET
           proposal_number = $1,
           status = $2,
           client = $3,
           areas = $4,
           pricing = $5,
           terms = $6,
           view_count = $7,
           viewed_at = $8,
           approved_at = $9,
           signer_name = $10,
           signature = $11,
           public_token = $12,
           signer_ip = $13,
           signer_user_agent = $14,
           signed_content_hash = $15,
           updated_at = NOW()
         WHERE id = $16 AND user_id = $17 AND status <> 'APPROVED'`,
        [
          proposalNumber,
          proposal.status,
          JSON.stringify(proposal.client),
          JSON.stringify(proposal.areas),
          JSON.stringify(proposal.pricing),
          JSON.stringify(proposal.terms),
          proposal.viewCount || 0,
          proposal.viewedAt ? new Date(proposal.viewedAt) : null,
          proposal.approvedAt ? new Date(proposal.approvedAt) : null,
          proposal.signerName || null,
          proposal.signature || null,
          publicToken,
          proposal.signerIp || null,
          proposal.signerUserAgent || null,
          proposal.signedContentHash || null,
          id,
          userId,
        ]
      );
      if (updated.rowCount === 0) throw new Error('PROPOSAL_ALREADY_APPROVED');
    } else {
      await this.pool.query(
        `INSERT INTO proposals (
           id, user_id, public_token, proposal_number, status, client, areas, pricing,
           terms, view_count, viewed_at, approved_at, signer_name, signature,
           signer_ip, signer_user_agent, signed_content_hash, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, NOW()
         )`,
        [
          id,
          targetUserId || null,
          publicToken,
          proposalNumber,
          proposal.status || 'DRAFT',
          JSON.stringify(proposal.client),
          JSON.stringify(proposal.areas),
          JSON.stringify(proposal.pricing),
          JSON.stringify(proposal.terms),
          proposal.viewCount || 0,
          proposal.viewedAt ? new Date(proposal.viewedAt) : null,
          proposal.approvedAt ? new Date(proposal.approvedAt) : null,
          proposal.signerName || null,
          proposal.signature || null,
          proposal.signerIp || null,
          proposal.signerUserAgent || null,
          proposal.signedContentHash || null,
          proposal.createdAt ? new Date(proposal.createdAt) : new Date(now),
        ]
      );
    }

    const saved = await this.getProposalById(id, userId);
    return saved || proposal;
  }

  async deleteProposal(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM proposals WHERE id = $1 AND user_id = $2', [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  async duplicateProposal(id: string, newClientName: string | undefined, userId: string): Promise<Proposal | undefined> {
    const original = await this.getProposalById(id, userId);
    if (!original) return undefined;

    const countRes = await this.pool.query('SELECT COUNT(*) FROM proposals WHERE user_id = $1', [userId]);
    const totalCount = parseInt(countRes.rows[0].count, 10) || 0;

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
    if (!proposal.userId) return undefined;
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
    const approvedAt = new Date().toISOString();
    const contentHash = hashProposalContent(proposal);
    const result = await this.pool.query(
      `UPDATE proposals SET status = 'APPROVED', approved_at = $1, signer_name = $2, signature = $3,
         signer_ip = $4, signer_user_agent = $5, signed_content_hash = $6, updated_at = NOW()
       WHERE public_token = $7 AND user_id = $8 AND status = 'SENT' RETURNING *`,
      [approvedAt, signerName.trim(), signature, context.ip || null, context.userAgent || null, contentHash, token, proposal.userId]
    );
    if (!result.rows[0]) throw new Error('PROPOSAL_NOT_APPROVABLE');
    return this.mapProposalRow(result.rows[0]);
  }

  // --- ASSINATURAS E QUOTAS ---

  async getSubscription(userId?: string): Promise<UserSubscription> {
    let planId: PlanTier = 'free';
    let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE';
    let currentCycleStart = new Date().toISOString();

    if (userId) {
      const res = await this.pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
      if (res.rows.length === 0) {
        await this.pool.query(
          `INSERT INTO subscriptions (user_id, plan_id, status, current_cycle_start, updated_at)
           VALUES ($1, 'free', 'ACTIVE', NOW(), NOW())`,
          [userId]
        );
      } else {
        const row = res.rows[0];
        planId = row.plan_id as PlanTier;
        status = row.status;
        currentCycleStart = row.current_cycle_start.toISOString ? row.current_cycle_start.toISOString() : String(row.current_cycle_start);
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
      await this.pool.query(
        `INSERT INTO subscriptions (user_id, plan_id, status, current_cycle_start, updated_at)
         VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           status = 'ACTIVE',
           current_cycle_start = NOW(),
           updated_at = NOW()`,
        [userId, newPlanId]
      );
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
      viewedAt: row.viewed_at ? (row.viewed_at.toISOString ? row.viewed_at.toISOString() : String(row.viewed_at)) : undefined,
      approvedAt: row.approved_at ? (row.approved_at.toISOString ? row.approved_at.toISOString() : String(row.approved_at)) : undefined,
      signerName: row.signer_name || undefined,
      signature: row.signature || undefined,
      publicToken: row.public_token || undefined,
      signerIp: row.signer_ip || undefined,
      signerUserAgent: row.signer_user_agent || undefined,
      signedContentHash: row.signed_content_hash || undefined,
      createdAt: row.created_at ? (row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at)) : new Date().toISOString(),
      updatedAt: row.updated_at ? (row.updated_at.toISOString ? row.updated_at.toISOString() : String(row.updated_at)) : new Date().toISOString(),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async claimWebhookEvent(eventId: string): Promise<'claimed' | 'processed' | 'processing'> {
    const inserted = await this.pool.query(
      `INSERT INTO webhook_events (event_id, status) VALUES ($1, 'PROCESSING')
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId]
    );
    if (inserted.rows.length) return 'claimed';
    const current = await this.pool.query('SELECT status, updated_at FROM webhook_events WHERE event_id = $1', [eventId]);
    if (current.rows[0]?.status === 'PROCESSED') return 'processed';
    const leaseExpired = !current.rows[0] || new Date(current.rows[0].updated_at).getTime() < Date.now() - 5 * 60 * 1000;
    if (!leaseExpired) return 'processing';
    const reclaimed = await this.pool.query(
      `UPDATE webhook_events SET status = 'PROCESSING', updated_at = NOW()
       WHERE event_id = $1 AND status = 'PROCESSING' AND updated_at < NOW() - INTERVAL '5 minutes'
       RETURNING event_id`,
      [eventId]
    );
    return reclaimed.rows.length ? 'claimed' : 'processing';
  }

  async completeWebhookEvent(eventId: string): Promise<void> {
    await this.pool.query("UPDATE webhook_events SET status = 'PROCESSED', updated_at = NOW() WHERE event_id = $1", [eventId]);
  }

  async releaseWebhookEvent(eventId: string): Promise<void> {
    await this.pool.query("DELETE FROM webhook_events WHERE event_id = $1 AND status = 'PROCESSING'", [eventId]);
  }
}
