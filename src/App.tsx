import React, { useState, useEffect } from 'react';
import { Proposal, ProviderProfile, WorkAreaConfig, UserSubscription, PlanTier, User, AuthResponse } from './types.js';
import { api } from './services/api.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './components/LandingPage.js';
import { ProposalForm } from './components/ProposalForm.js';
import { ProposalList } from './components/ProposalList.js';
import { ProfileModal } from './components/ProfileModal.js';
import { PublicProposalViewer } from './components/PublicProposalViewer.js';
import { UpgradeModal } from './components/UpgradeModal.js';
import { AuthModal } from './components/AuthModal.js';
import { getKiwifyCheckoutUrl } from './config/payments.js';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'new' | 'list' | 'profile'>('landing');
  const [catalog, setCatalog] = useState<WorkAreaConfig[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [publicProposalId, setPublicProposalId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const match = window.location.hash.match(/(?:#proposta=|\/proposta\/)([^&]+)/);
      return match ? match[1] : null;
    }
    return null;
  });
  const [profile, setProfile] = useState<ProviderProfile>({
    companyName: 'Pintura & Acabamentos Residenciais',
    phones: ['(11) 90000-0000'],
    address: 'Atendimento em toda a região',
  });
  const [loading, setLoading] = useState(true);

  // Listener para hash routing (#proposta=id)
  useEffect(() => {
    const handleHashChange = () => {
      const match = window.location.hash.match(/(?:#proposta=|\/proposta\/)([^&]+)/);
      setPublicProposalId(match ? match[1] : null);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Inicialização de dados vindos do backend
  useEffect(() => {
    async function loadData() {
      try {
        const catData = await api.getCatalog();
        setCatalog(catData);

        // Verificar se há sessão de usuário ativa
        const authData = await api.getMe();
        if (authData) {
          setUser(authData.user);
          setProfile(authData.profile);
          setSubscription(authData.subscription);
          const propData = await api.getProposals().catch(() => []);
          setProposals(propData);
        } else {
          // Carregar perfil e assinatura genéricos se disponíveis
          try {
            const [profData, subData] = await Promise.all([
              api.getProfile().catch(() => null),
              api.getSubscription().catch(() => null),
            ]);
            if (profData) setProfile(profData);
            if (subData) setSubscription(subData);
          } catch {
            // Ignora se não autenticado
          }
        }
      } catch (err) {
        console.error('Erro ao conectar ao backend:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTabChange = (tab: 'landing' | 'new' | 'list' | 'profile') => {
    if (tab === 'new') {
      if (!user) {
        setAuthMode('register');
        setIsAuthOpen(true);
        return;
      }
      if (
        subscription &&
        subscription.monthlyLimit !== -1 &&
        subscription.usedProposalsCount >= subscription.monthlyLimit &&
        !editingProposal
      ) {
        setIsUpgradeOpen(true);
        return;
      }
    }
    if ((tab === 'list' || tab === 'profile') && !user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleAuthSuccess = async (authData: AuthResponse) => {
    setUser(authData.user);
    if (authData.profile) setProfile(authData.profile);
    if (authData.subscription) setSubscription(authData.subscription);

    try {
      const propData = await api.getProposals();
      setProposals(propData);
    } catch {
      setProposals([]);
    }

    setActiveTab('new');
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setProposals([]);
    setSubscription(null);
    setActiveTab('landing');
  };

  const handleProposalSaved = (saved: Proposal) => {
    setProposals((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    api.getSubscription().then(setSubscription).catch(console.error);
  };

  const handleEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setActiveTab('new');
  };

  const handleNewProposal = () => {
    if (!user) {
      setAuthMode('register');
      setIsAuthOpen(true);
      return;
    }
    if (subscription && subscription.monthlyLimit !== -1 && subscription.usedProposalsCount >= subscription.monthlyLimit) {
      setIsUpgradeOpen(true);
      return;
    }
    setEditingProposal(null);
    setActiveTab('new');
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await api.duplicateProposal(id);
      setProposals((prev) => [dup, ...prev]);
      setEditingProposal(dup);
      setActiveTab('new');
      api.getSubscription().then(setSubscription).catch(console.error);
    } catch (err: any) {
      if (err.code === 'QUOTA_EXCEEDED') {
        setIsUpgradeOpen(true);
      } else {
        alert(err.message || 'Erro ao duplicar proposta');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
      if (editingProposal?.id === id) {
        setEditingProposal(null);
      }
      api.getSubscription().then(setSubscription).catch(console.error);
    } catch (err) {
      alert('Erro ao excluir proposta');
    }
  };

  const handleSaveProfile = async (updated: ProviderProfile) => {
    const res = await api.updateProfile(updated);
    setProfile(res);
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      setAuthMode('register');
      setIsAuthOpen(true);
      return;
    }
    if (planId === 'free') {
      setActiveTab('new');
    } else {
      const kiwifyUrl = getKiwifyCheckoutUrl(planId as PlanTier, user);
      if (kiwifyUrl) {
        window.open(kiwifyUrl, '_blank');
      } else {
        try {
          const updated = await api.upgradeSubscription(planId as PlanTier);
          setSubscription(updated);
          setActiveTab('new');
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao ativar plano';
          alert(msg);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3 bg-slate-50 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Carregando Proposta do Pintor...</p>
      </div>
    );
  }

  if (publicProposalId) {
    return (
      <PublicProposalViewer
        proposalId={publicProposalId}
        onBack={() => {
          setPublicProposalId(null);
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fffaf0] text-[#0a0a0a] w-full max-w-full overflow-x-hidden">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        proposalCount={proposals.length}
        subscription={subscription}
        user={user}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onOpenAuth={() => {
          setAuthMode('login');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onGoToApp={() => {
              if (user) {
                setActiveTab('new');
              } else {
                setAuthMode('register');
                setIsAuthOpen(true);
              }
            }}
            onSelectPlan={handleSelectPlan}
          />
        )}

        {activeTab === 'new' && (
          <div className="py-4">
            <ProposalForm
              key={editingProposal?.id || 'new-proposal'}
              initialProposal={editingProposal}
              catalog={catalog}
              profile={profile}
              subscription={subscription}
              user={user}
              onSaved={handleProposalSaved}
              onOpenUpgrade={() => setIsUpgradeOpen(true)}
              onRequireAuth={() => {
                setAuthMode('register');
                setIsAuthOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="py-4">
            <ProposalList
              proposals={proposals}
              profile={profile}
              onEdit={handleEditProposal}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onNew={handleNewProposal}
              onViewPublic={(id) => {
                setPublicProposalId(id);
                window.location.hash = `proposta=${id}`;
              }}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="py-4">
            <ProfileModal
              profile={profile}
              onSave={handleSaveProfile}
            />
          </div>
        )}
      </main>

      {/* Modal de Autenticação (Login & Cadastro) */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Modal de Paywall e Upgrade com Ancoragem de Preço */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        subscription={subscription}
        user={user}
        onPlanUpgraded={(updated) => setSubscription(updated)}
      />
    </div>
  );
};
