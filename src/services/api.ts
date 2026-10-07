import { Proposal, ProviderProfile, WorkAreaConfig, SelectedAreaScope, PricingSummary, UserSubscription, PlanTier, User, AuthResponse } from '../types.js';

const API_BASE = '/api';
const TOKEN_KEY = 'proposta_pintor_auth_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  getToken,
  setToken,
  removeToken,

  // --- AUTENTICAÇÃO ---
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new Error('Serviço de API indisponível (404). O backend ainda não foi implantado na Vercel.');
      }
      throw new Error(err.error || `Erro ao criar conta (${res.status})`);
    }
    const data: AuthResponse = await res.json();
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new Error('Serviço de API indisponível (404). O backend ainda não foi implantado na Vercel.');
      }
      throw new Error(err.error || 'E-mail ou senha incorretos');
    }
    const data: AuthResponse = await res.json();
    setToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});
    }
    removeToken();
  },

  async getMe(): Promise<{ user: User; profile: ProviderProfile; subscription: UserSubscription } | null> {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      removeToken();
      return null;
    }
    return res.json();
  },

  // --- CATÁLOGO DE ESCOPOS ---
  async getCatalog(): Promise<WorkAreaConfig[]> {
    const res = await fetch(`${API_BASE}/catalog/areas`);
    if (!res.ok) throw new Error('Falha ao carregar catálogo de áreas');
    return res.json();
  },

  async resolveScope(areaId: string, options?: any): Promise<SelectedAreaScope> {
    const res = await fetch(`${API_BASE}/catalog/resolve-scope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ areaId, options }),
    });
    if (!res.ok) throw new Error('Falha ao resolver escopo da área');
    return res.json();
  },

  // --- PRECIFICAÇÃO ---
  async calculatePricing(payload: {
    mode: 'GLOBAL' | 'BY_AREA';
    areas: SelectedAreaScope[];
    globalAmount?: number;
    discountNominal?: number;
    discountPercent?: number;
    paymentCondition?: string;
  }): Promise<{ summary: PricingSummary; schedule: { description: string; amount: number; percentage: number }[] }> {
    const res = await fetch(`${API_BASE}/pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao calcular precificação');
    return res.json();
  },

  // --- PERFIL DO PRESTADOR ---
  async getProfile(): Promise<ProviderProfile> {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar dados do prestador');
    return res.json();
  },

  async updateProfile(profile: ProviderProfile): Promise<ProviderProfile> {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Falha ao salvar dados do prestador');
    return res.json();
  },

  // --- ASSINATURA ---
  async getSubscription(): Promise<UserSubscription> {
    const res = await fetch(`${API_BASE}/subscription`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar assinatura');
    return res.json();
  },

  async upgradeSubscription(planId: PlanTier): Promise<UserSubscription> {
    const res = await fetch(`${API_BASE}/subscription/upgrade`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Falha ao atualizar plano');
    }
    return res.json();
  },

  // --- PROPOSTAS ---
  async getProposals(): Promise<Proposal[]> {
    const res = await fetch(`${API_BASE}/proposals`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao buscar lista de propostas');
    return res.json();
  },

  async getProposal(id: string): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/proposals/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao buscar proposta');
    return res.json();
  },

  async saveProposal(proposal: Proposal): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/proposals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(proposal),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.message || 'Falha ao salvar proposta') as any;
      err.code = errData.error;
      err.subscription = errData.subscription;
      throw err;
    }
    return res.json();
  },

  async deleteProposal(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/proposals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao excluir proposta');
  },

  async duplicateProposal(id: string, newClientName?: string): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/proposals/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newClientName }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.message || 'Falha ao duplicar proposta') as any;
      err.code = errData.error;
      err.subscription = errData.subscription;
      throw err;
    }
    return res.json();
  },

  // --- RASTREAMENTO E ASSINATURA PÚBLICA ---
  async getPublicProposal(id: string): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/public/proposals/${id}`);
    if (!res.ok) throw new Error('Falha ao carregar proposta');
    return res.json();
  },

  async trackProposalView(id: string): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/proposals/${id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Falha ao registrar visualização');
    return res.json();
  },

  async approveProposal(id: string, payload: { signerName: string; signature: string }): Promise<Proposal> {
    const res = await fetch(`${API_BASE}/proposals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao aprovar proposta');
    }
    return res.json();
  },
};
