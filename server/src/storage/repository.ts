import {
  Proposal,
  ProviderProfile,
  PlanTier,
  UserSubscription,
  User,
  StoredUser,
  AuthResponse
} from '../types/domain.js';

export interface IRepository {
  // Usuários e Autenticação
  registerUser(name: string, email: string, password: string): Promise<AuthResponse>;
  loginUser(email: string, password: string): Promise<AuthResponse>;
  getUserByToken(token: string): Promise<User | undefined>;
  deleteSession(token: string): Promise<boolean>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<StoredUser | undefined>;

  // Compras pendentes da Kiwify
  savePendingUpgrade(email: string, planId: PlanTier): Promise<void>;
  getPendingUpgrade(email: string): Promise<PlanTier | undefined>;
  removePendingUpgrade(email: string): Promise<void>;
  activateSubscriptionByEmail(email: string, planId: PlanTier): Promise<UserSubscription>;
  cancelSubscriptionByEmail(email: string): Promise<boolean>;

  // Perfil da Empresa do Pintor
  getProfile(userId?: string): Promise<ProviderProfile>;
  updateProfile(profile: ProviderProfile, userId?: string): Promise<ProviderProfile>;

  // Orçamentos e Propostas
  listProposals(userId?: string): Promise<Proposal[]>;
  getProposalById(id: string, userId?: string): Promise<Proposal | undefined>;
  saveProposal(proposal: Proposal, userId?: string): Promise<Proposal>;
  deleteProposal(id: string, userId?: string): Promise<boolean>;
  duplicateProposal(id: string, newClientName?: string, userId?: string): Promise<Proposal | undefined>;
  trackView(id: string): Promise<Proposal | undefined>;
  approveProposal(id: string, signerName: string, signature: string): Promise<Proposal | undefined>;

  // Assinaturas e Quota
  getSubscription(userId?: string): Promise<UserSubscription>;
  checkQuota(userId?: string): Promise<{ allowed: boolean; subscription: UserSubscription; message?: string }>;
  upgradeSubscription(newPlanId: PlanTier, userId?: string): Promise<UserSubscription>;
}
