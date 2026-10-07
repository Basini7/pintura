import React from 'react';
import { Check, Sparkles, Zap, Shield, ArrowRight, Gift } from 'lucide-react';

interface PricingTableProps {
  onSelectPlan: (planId: string) => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan }) => {
  return (
    <section className="py-24 bg-[#fffaf0] px-4 border-t border-[#e5e5e5]" id="precos">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Cabeçalho Clay Style */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-block text-xs font-semibold tracking-wider text-[#0a0a0a] bg-[#f5f0e0] border border-[#e5e5e5] px-3.5 py-1 rounded-full uppercase">
            Planos Transparentes
          </span>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#0a0a0a] leading-tight">
            Invista menos que 1 lata de tinta e feche obras de dezenas de milhares
          </h2>
          <p className="text-[#6a6a6a] text-sm sm:text-base leading-relaxed">
            Escolha o plano ideal para a sua rotina. Cancele quando quiser, sem fidelidade ou letras miúdas.
          </p>
        </div>

        {/* Banner do Plano Degustação (Free Tier Desacoplado - Warm Peach Clay Card) */}
        <div className="bg-[#ffb084] text-[#0a0a0a] rounded-3xl p-6 sm:p-7 shadow-sm border border-[#e5e5e5] flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center space-x-4 text-center sm:text-left">
            <div className="p-3.5 bg-white/40 rounded-2xl text-[#0a0a0a] shrink-0 hidden sm:block">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-[#0a0a0a] text-white px-2.5 py-0.5 rounded-full">
                  DEGUSTAÇÃO 100% GRÁTIS
                </span>
                <span className="text-xs font-medium text-[#3a3a3a]">Sem necessidade de cartão</span>
              </div>
              <p className="text-sm font-semibold text-[#1a1a1a] mt-1.5">
                Crie agora sua 1ª proposta real com injeção automática de escopo, cálculo de áreas e PDF formal.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectPlan('free')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] transition-all shrink-0 flex items-center justify-center space-x-2"
          >
            <span>Testar 1 Proposta Grátis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grade de 3 Planos (Good - Better - Best Clay Format) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* 1. BÁSICO (Good - Clean Canvas Card) */}
          <div className="rounded-3xl p-7 bg-[#fffaf0] border border-[#e5e5e5] flex flex-col justify-between hover:border-[#1a1a1a] transition-all">
            <div>
              <h3 className="text-lg font-bold text-[#0a0a0a]">Plano Básico</h3>
              <p className="text-xs text-[#6a6a6a] mt-1">Para quem faz orçamentos eventuais</p>
              
              <div className="mt-5 flex items-baseline">
                <span className="text-4xl font-semibold tracking-tight text-[#0a0a0a]">R$ 38</span>
                <span className="text-xs text-[#6a6a6a] ml-1 font-medium">/mês</span>
              </div>
              <div className="mt-2.5 inline-block text-[11px] font-bold text-[#0a0a0a] bg-[#f5f0e0] px-3 py-1 rounded-full border border-[#e5e5e5]">
                Até 4 propostas por mês
              </div>

              <div className="border-t border-[#e5e5e5] my-6" />

              <ul className="space-y-3 text-xs text-[#3a3a3a]">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>PDF profissional sem marca d’água</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Todos os 4 substratos e 11 áreas</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Disparo formatado para WhatsApp</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Cálculo e parcelamento em Real</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-[#e5e5e5]">
              <button
                onClick={() => onSelectPlan('basic')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5] hover:bg-[#f5f0e0] transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Assinar Básico</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. INTERMEDIÁRIO (Better - Cream Surface Card) */}
          <div className="rounded-3xl p-7 bg-[#f5f0e0] border border-[#e5e5e5] flex flex-col justify-between hover:border-[#1a1a1a] transition-all">
            <div>
              <h3 className="text-lg font-bold text-[#0a0a0a]">Intermediário</h3>
              <p className="text-xs text-[#6a6a6a] mt-1">Para profissionais e pequenas equipes</p>
              
              <div className="mt-5 flex items-baseline">
                <span className="text-4xl font-semibold tracking-tight text-[#0a0a0a]">R$ 47</span>
                <span className="text-xs text-[#6a6a6a] ml-1 font-medium">/mês</span>
              </div>
              <div className="mt-2.5 inline-block text-[11px] font-bold text-[#1a3a3a] bg-[#a4d4c5]/40 px-3 py-1 rounded-full border border-[#a4d4c5]">
                Até 12 propostas por mês
              </div>

              <div className="border-t border-[#e5e5e5] my-6" />

              <ul className="space-y-3 text-xs text-[#3a3a3a]">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Tudo do plano Básico incluído</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Duplicação rápida de orçamentos</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Histórico completo na nuvem</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Suporte via e-mail e chat</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-[#e5e5e5]">
              <button
                onClick={() => onSelectPlan('intermediary')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#fffaf0] text-[#0a0a0a] border border-[#e5e5e5] hover:bg-white transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Assinar Intermediário</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. PRO ILIMITADO (Best - Deep Teal Featured Card - DESIGN.md flagship) */}
          <div className="relative rounded-3xl p-7 bg-[#1a3a3a] text-white flex flex-col justify-between shadow-xl -translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff4d8b] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#fffaf0]" />
              <span>Mais Escolhido • Melhor Custo</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Pro Ilimitado</h3>
              <p className="text-xs text-[#a4d4c5] mt-1">Para quem vive de fechar serviços</p>
              
              <div className="mt-5 flex items-baseline">
                <span className="text-4xl font-semibold tracking-tight text-white">R$ 59</span>
                <span className="text-xs text-[#a4d4c5] ml-1 font-medium">/mês</span>
              </div>
              
              {/* Ancoragem Psicológica Explícita */}
              <div className="mt-2.5 bg-white/10 border border-white/20 p-2.5 rounded-2xl">
                <p className="text-[11px] font-semibold text-[#a4d4c5] leading-tight">
                  ✨ Propostas ILIMITADAS por apenas R$ 12 a mais que o plano Intermediário (R$ 0,40/dia)!
                </p>
              </div>

              <div className="border-t border-white/15 my-6" />

              <ul className="space-y-3 text-xs text-[#fffaf0]">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0 mt-0.5" />
                  <span><strong>Propostas Infinitas:</strong> Crie quantas quiser no mês</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0 mt-0.5" />
                  <span>PDF formal sem marca d’água</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0 mt-0.5" />
                  <span>Suporte prioritário VIP no WhatsApp</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-[#a4d4c5] shrink-0 mt-0.5" />
                  <span>Acesso antecipado a novos recursos</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-white/15">
              <button
                onClick={() => onSelectPlan('pro')}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-black text-[#0a0a0a] bg-[#fffaf0] hover:bg-white transition-all flex items-center justify-center space-x-1.5 shadow-md"
              >
                <span>Garantir Pro Ilimitado</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé de Confiança */}
        <div className="text-center text-xs text-[#6a6a6a] flex flex-wrap items-center justify-center gap-6 pt-4">
          <span className="flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-[#22c55e]" />
            <span>Garantia de 7 dias ou seu dinheiro de volta</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-[#e8b94a]" />
            <span>Ativação imediata no Pix ou Cartão</span>
          </span>
          <span>Sem fidelidade • Cancele quando quiser com 1 clique</span>
        </div>
      </div>
    </section>
  );
};
