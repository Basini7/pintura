export type SubstrateCategory = 
  | 'ALVENARIA_INTERNA' 
  | 'ALVENARIA_EXTERNA' 
  | 'MADEIRAMENTOS' 
  | 'METALICOS';

export type ProposalStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type PricingMode = 'GLOBAL' | 'BY_AREA';

export interface StepDefinition {
  id: string;
  order: number;
  description: string;
  isOptional?: boolean;
}

export interface WorkAreaConfig {
  id: string;
  name: string;
  category: SubstrateCategory;
  defaultSteps: StepDefinition[];
  supportedVariations?: {
    cleaning?: ('Limpeza simples' | 'Hidrojateamento')[];
    finish?: ('Pintura Acrílica' | 'Textura Cristal' | 'Textura Granfino Hidro-repelente' | 'Outra')[];
    woodFinish?: ('Verniz' | 'Esmalte Sintético')[];
    hasBurnedCementTreatment?: boolean;
  };
}

export interface SelectedAreaScope {
  areaId: string;
  areaName: string;
  category: SubstrateCategory;
  steps: string[];
  optionsSelected?: {
    cleaningMethod?: string;
    finishType?: string;
    customFinishText?: string;
    woodFinishType?: string;
    includeBurnedCement?: boolean;
  };
  price?: number;
}

export interface ClientInfo {
  name: string;
  phone?: string;
  email?: string;
  address: string;
  city?: string;
  propertyType?: 'Casa' | 'Apartamento' | 'Sobrado' | 'Comercial' | 'Outro';
  notes?: string;
}

export interface ProviderProfile {
  companyName: string;
  contactName?: string;
  phones: string[];
  address?: string;
  pixKey?: string;
}

export interface CommercialTerms {
  includesMaterials: boolean;
  paymentCondition: string;
  customPaymentCondition?: string;
  withInvoice: boolean;
  validityDays: number;
  executionDeadlineDays?: number;
  generalNotes?: string;
}

export interface PricingSummary {
  mode: PricingMode;
  totalAmount: number;
  discount: number;
  netAmount: number;
}

export interface Proposal {
  id: string;
  userId?: string;
  publicToken?: string;
  proposalNumber: string;
  createdAt: string;
  updatedAt: string;
  client: ClientInfo;
  areas: SelectedAreaScope[];
  pricing: PricingSummary;
  terms: CommercialTerms;
  status: ProposalStatus;
  viewedAt?: string;
  viewCount?: number;
  approvedAt?: string;
  signature?: string;
  signerName?: string;
}

export type PublicProposalDTO = Pick<
  Proposal,
  'proposalNumber' | 'createdAt' | 'client' | 'areas' | 'pricing' | 'terms' | 'status' | 'viewedAt' | 'viewCount' | 'approvedAt' | 'signerName'
>;

export type PlanTier = 'free' | 'basic' | 'intermediate' | 'pro';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  price: number;
  monthlyLimit: number; // 1 para free, 4 para basic, 12 para intermediate, -1 para pro
  hasWatermark: boolean;
  prioritySupport: boolean;
}

export interface UserSubscription {
  planId: PlanTier;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentCycleStart: string;
  usedProposalsCount: number;
  monthlyLimit: number;
  hasWatermark: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  profile?: ProviderProfile;
  subscription?: UserSubscription;
}
