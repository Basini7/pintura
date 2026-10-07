import React from 'react';
import { Paintbrush, FileText, History, User as UserIcon, Sparkles, Zap, LogIn, LogOut } from 'lucide-react';
import { UserSubscription, User } from '../types.js';

interface NavbarProps {
  activeTab: 'landing' | 'new' | 'list' | 'profile';
  setActiveTab: (tab: 'landing' | 'new' | 'list' | 'profile') => void;
  proposalCount: number;
  subscription: UserSubscription | null;
  user: User | null;
  onOpenUpgrade: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  proposalCount,
  subscription,
  user,
  onOpenUpgrade,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="bg-[#fffaf0]/95 backdrop-blur-md text-[#0a0a0a] border-b border-[#e5e5e5] sticky top-0 z-30 transition-all w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
        {/* Linha Principal (Marca + Ações do Usuário) */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Marca */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer shrink-0" 
            onClick={() => setActiveTab('landing')}
          >
            <div className="bg-[#0a0a0a] p-1.5 sm:p-2 rounded-xl text-white shadow-sm">
              <Paintbrush className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffb084]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base leading-tight tracking-tight text-[#0a0a0a]">
                  Proposta do Pintor
                </span>
                <span className="text-[9px] sm:text-[10px] bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] px-1.5 py-0.2 rounded-full font-bold uppercase">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#6a6a6a] hidden sm:block">
                Orçamentos Rápidos & Profissionais
              </p>
            </div>
          </div>

          {/* Área do Usuário / Entrar + Indicador de Plano */}
          <div className="flex items-center gap-2 shrink-0">
            {user && subscription && (
              <div className="flex items-center gap-1.5 bg-[#f5f0e0] border border-[#e5e5e5] px-2 sm:px-2.5 py-1 rounded-xl text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  subscription.monthlyLimit !== -1 && subscription.usedProposalsCount >= subscription.monthlyLimit 
                    ? 'bg-[#e8b94a] animate-pulse' 
                    : 'bg-[#22c55e]'
                }`} />
                <span className="font-semibold text-[#0a0a0a] uppercase text-[9px] sm:text-[10px]">
                  {subscription.planId === 'free' ? 'Degustação' : subscription.planId}
                </span>
                <span className="text-[#6a6a6a] font-mono text-[10px] sm:text-[11px] hidden xs:inline">
                  {subscription.monthlyLimit === -1 ? 'Ilimitado' : `${subscription.usedProposalsCount}/${subscription.monthlyLimit}`}
                </span>
                <button
                  onClick={onOpenUpgrade}
                  className="text-[10px] sm:text-[11px] font-bold text-[#0a0a0a] bg-[#ffb084] hover:bg-[#ffb084]/80 px-2 py-0.5 rounded-lg border border-[#e5e5e5] transition flex items-center gap-0.5 ml-1"
                >
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Upgrade</span>
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center pl-1.5 border-l border-[#e5e5e5]">
                <span className="hidden md:inline text-xs font-semibold text-[#0a0a0a] mr-2 max-w-[100px] truncate" title={user.name}>
                  {user.name}
                </span>
                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  className="flex items-center gap-1 text-[#6a6a6a] hover:text-[#ef4444] p-1.5 sm:px-2 sm:py-1 rounded-xl hover:bg-[#faf5e8] text-xs transition"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha de Abas de Navegação (Totalmente Responsiva com Scroll Horizontal no Mobile) */}
        <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar pt-2 sm:pt-2.5 mt-1 border-t border-[#e5e5e5]/60 w-full">
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'landing'
                ? 'bg-[#0a0a0a] text-white shadow-sm'
                : 'text-[#3a3a3a] hover:bg-[#faf5e8]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e8b94a]" />
            <span className="hidden sm:inline">Página de Vendas</span>
            <span className="sm:hidden">Início</span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'new'
                ? 'bg-[#0a0a0a] text-white shadow-sm'
                : 'text-[#3a3a3a] hover:bg-[#faf5e8]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Gerador</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'list'
                ? 'bg-[#0a0a0a] text-white shadow-sm'
                : 'text-[#3a3a3a] hover:bg-[#faf5e8]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
            {user && proposalCount > 0 && (
              <span className="bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {proposalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              activeTab === 'profile'
                ? 'bg-[#0a0a0a] text-white shadow-sm'
                : 'text-[#3a3a3a] hover:bg-[#faf5e8]'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Perfil</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
