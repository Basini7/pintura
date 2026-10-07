import React, { useState } from 'react';
import { UserSubscription, PlanTier, User } from '../types.js';
import { api } from '../services/api.js';
import { getKiwifyCheckoutUrl, isValidPlanTier } from '../config/payments.js';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Lock, 
  X,
  CreditCard,
  Crown
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: UserSubscription | null;
  user?: User | null;
  onPlanUpgraded: (updated: UserSubscription) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  subscription,
  user,
  onPlanUpgraded,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlan = subscription?.planId || 'free';

  const handleSelectPlan = async (planId: PlanTier) => {
    if (!isValidPlanTier(planId) || planId === 'free') {
      alert('Plano inválido. Selecione uma opção de assinatura válida.');
      return;
    }

    const kiwifyUrl = getKiwifyCheckoutUrl(planId, user);
    if (kiwifyUrl) {
      window.open(kiwifyUrl, '_blank');
      onClose();
      return;
    }

    try {
      setLoadingPlan(planId);
      const updated = await api.upgradeSubscription(planId);
      onPlanUpgraded(updated);
      setSuccessToast(`🎉 Plano atualizado para ${planId.toUpperCase()} com sucesso! Limites liberados.`);
      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar plano';
      alert(`Erro: ${msg}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#fffaf0] rounded-3xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-[#e5e5e5] relative animate-in fade-in zoom-in-95 my-auto">
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#6a6a6a] hover:text-[#0a0a0a] p-2 rounded-full hover:bg-[#faf5e8] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Notificação interna de sucesso */}
        {successToast && (
          <div className="mb-4 bg-[#a4d4c5]/40 border border-[#a4d4c5] text-[#1a3a3a] p-3 rounded-xl text-center font-bold text-sm">
            {successToast}
          </div>
        )}

        {/* Cabeçalho de Conversão Clay Style */}
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] rounded-full text-xs font-bold mb-1">
            <Lock className="w-3.5 h-3.5 text-[#e8b94a]" />
            <span>Limite de Orçamentos Atingido</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-medium text-[#0a0a0a] tracking-tight">
            Desbloqueie novas propostas e <br className="hidden sm:inline" />
            <span className="text-[#ff4d8b]">feche até 3x mais contratos</span>
          </h2>

          <p className="text-[#6a6a6a] text-xs sm:text-sm">
            Você atingiu o limite do seu plano <strong>{currentPlan === 'free' ? 'Degustação (1 proposta)' : currentPlan.toUpperCase()}</strong>. 
            Escolha o plano ideal para a sua rotina sem fidelidade:
          </p>
        </div>

        {/* Grade Comparativa de Planos (Clay Good-Better-Best) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Plano Básico */}
          <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${
            currentPlan === 'basic' 
              ? 'border-[#0a0a0a] bg-[#faf5e8] ring-2 ring-[#0a0a0a]' 
              : 'border-[#e5e5e5] bg-[#fffaf0] hover:border-[#0a0a0a]'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-base text-[#0a0a0a]">Plano Básico</h3>
                {currentPlan === 'basic' && (
                  <span className="text-[10px] font-bold bg-[#0a0a0a] text-white px-2 py-0.5 rounded-full">Plano Atual</span>
                )}
              </div>
              <p className="text-xs text-[#6a6a6a] mb-4">Para quem faz orçamentos eventuais.</p>
              
              <div className="mb-5 flex items-baseline">
                <span className="text-xs text-[#6a6a6a] font-medium mr-1">R$</span>
                <span className="text-3xl font-black text-[#0a0a0a]">38</span>
                <span className="text-xs text-[#6a6a6a] ml-1">/mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-[#3a3a3a] mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span><strong>Até 4 propostas</strong> por mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Envio ilimitado via WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Rastreamento de visualizações</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Assinatura digital na tela</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('basic')}
              disabled={loadingPlan !== null || currentPlan === 'basic'}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] hover:bg-[#f5f0e0] disabled:opacity-50 transition"
            >
              {loadingPlan === 'basic' ? 'Ativando...' : currentPlan === 'basic' ? 'Plano Ativo' : 'Escolher Básico (R$ 38)'}
            </button>
          </div>

          {/* Plano Intermediário */}
          <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${
            currentPlan === 'intermediate' 
              ? 'border-[#0a0a0a] bg-[#faf5e8] ring-2 ring-[#0a0a0a]' 
              : 'border-[#e5e5e5] bg-[#f5f0e0] hover:border-[#0a0a0a]'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-base text-[#0a0a0a]">Intermediário</h3>
                {currentPlan === 'intermediate' && (
                  <span className="text-[10px] font-bold bg-[#0a0a0a] text-white px-2 py-0.5 rounded-full">Plano Atual</span>
                )}
              </div>
              <p className="text-xs text-[#6a6a6a] mb-4">Para profissionais com fluxo regular.</p>
              
              <div className="mb-5 flex items-baseline">
                <span className="text-xs text-[#6a6a6a] font-medium mr-1">R$</span>
                <span className="text-3xl font-black text-[#0a0a0a]">47</span>
                <span className="text-xs text-[#6a6a6a] ml-1">/mês</span>
              </div>

              <ul className="space-y-2.5 text-xs text-[#3a3a3a] mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span><strong>Até 12 propostas</strong> por mês</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Envio ilimitado via WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Rastreamento de visualizações</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <span>Assinatura digital na tela</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('intermediate')}
              disabled={loadingPlan !== null || currentPlan === 'intermediate'}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-white disabled:opacity-50 transition"
            >
              {loadingPlan === 'intermediate' ? 'Ativando...' : currentPlan === 'intermediate' ? 'Plano Ativo' : 'Escolher Intermediário (R$ 47)'}
            </button>
          </div>

          {/* Plano Pro Ilimitado (Highlight Clay: Deep Teal #1a3a3a) */}
          <div className="rounded-3xl p-6 bg-[#1a3a3a] text-white relative flex flex-col justify-between shadow-xl transform md:-translate-y-1">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff4d8b] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              <span>Mais Escolhido</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 mt-1">
                <h3 className="font-bold text-lg text-white">Pro Ilimitado</h3>
                <span className="text-[10px] font-bold text-[#a4d4c5] bg-white/10 px-2 py-0.5 rounded-full">Melhor Custo</span>
              </div>
              <p className="text-xs text-[#a4d4c5] mb-3">Sem nenhuma trava ou limite de propostas.</p>
              
              <div className="mb-2 flex items-baseline">
                <span className="text-xs text-[#a4d4c5] font-medium mr-1">R$</span>
                <span className="text-4xl font-black text-white">59</span>
                <span className="text-xs text-[#a4d4c5] ml-1">/mês</span>
              </div>

              {/* Ancoragem Psicológica de Preço */}
              <div className="bg-white/10 text-[#a4d4c5] text-[11px] font-semibold px-2.5 py-1.5 rounded-xl mb-4 border border-white/15">
                Apenas <strong>+R$ 12/mês</strong> sobre o plano de 12 propostas (R$ 0,40 por dia!).
              </div>

              <ul className="space-y-2.5 text-xs text-[#fffaf0] mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0 stroke-[3]" />
                  <span><strong>Propostas 100% ILIMITADAS</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0" />
                  <span><strong>Sem marca d’água</strong> no PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0" />
                  <span>Assinatura digital e link online</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={loadingPlan !== null || currentPlan === 'pro'}
              className="w-full py-3 px-4 rounded-xl text-xs font-black bg-[#fffaf0] hover:bg-white text-[#0a0a0a] shadow-md disabled:opacity-50 transition"
            >
              {loadingPlan === 'pro' ? 'Ativando...' : currentPlan === 'pro' ? 'Plano Ativo' : 'Garantir Pro Ilimitado (R$ 59)'}
            </button>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="mt-8 pt-5 border-t border-[#e5e5e5] flex flex-wrap items-center justify-between text-xs text-[#6a6a6a] gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
              Garantia total de 7 dias
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#e8b94a]" />
              Ativação imediata via Pix
            </span>
          </div>
          <span>Cancele a qualquer momento com 1 clique</span>
        </div>
      </div>
    </div>
  );
};
