import React, { useState } from 'react';
import { PricingTable } from './PricingTable.js';
import { LegalModal } from './LegalModal.js';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Share2, 
  FileCheck, 
  ShieldCheck,
  Zap,
  PenTool
} from 'lucide-react';

interface LandingPageProps {
  onGoToApp: () => void;
  onSelectPlan: (planId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToApp, onSelectPlan }) => {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

  const openLegal = (tab: 'terms' | 'privacy') => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <div className="bg-[#fffaf0] text-[#0a0a0a] selection:bg-[#ffb084] selection:text-[#0a0a0a] w-full max-w-full overflow-hidden">
      {/* 1. HERO SECTION (Clay Hero Band: Cream Canvas + Bold Ink + Saturated Accent) */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 bg-[#fffaf0] border-b border-[#e5e5e5] w-full max-w-full">
        <div className="max-w-5xl mx-auto text-center space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
          <div className="inline-flex items-center space-x-2 bg-[#f5f0e0] text-[#0a0a0a] px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold border border-[#e5e5e5] max-w-full">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e8b94a] shrink-0" />
            <span className="truncate">Mais de 12.000 orçamentos aprovados no Brasil</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#0a0a0a] max-w-4xl mx-auto leading-tight sm:leading-[1.08] break-words">
            Pare de perder clientes para orçamentos feios em PDF. <br className="hidden sm:inline" />
            <span className="text-[#ff4d8b]">Feche contratos 3x mais rápido.</span>
          </h1>

          <p className="text-[#3a3a3a] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Crie propostas interativas completas em menos de 3 minutos, com cálculo automático, 
            etapas técnicas padronizadas e envio imediato no WhatsApp e PDF formal.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGoToApp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Criar Minha Primeira Proposta Grátis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#precos"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-white hover:bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5] transition-all text-center"
            >
              Ver Planos e Valores
            </a>
          </div>

          <p className="text-xs text-[#6a6a6a]">
            ✓ Sem necessidade de cartão de crédito no teste • Leva menos de 60 segundos
          </p>

          {/* Mockup Preview (Clay Illustrated Artifact Card) */}
          <div className="pt-10 max-w-3xl mx-auto">
            <div className="bg-[#faf5e8] p-4 sm:p-5 rounded-3xl border border-[#e5e5e5] shadow-sm">
              <div className="bg-white rounded-2xl p-5 sm:p-7 text-left text-[#0a0a0a] border border-[#e5e5e5]">
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0a0a0a] bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-1 rounded-full">
                      PROP-2026-001 • APROVADO
                    </span>
                    <h3 className="text-lg font-bold text-[#0a0a0a] mt-2">
                      Proposta Comercial — Fachada & Muros
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#6a6a6a] uppercase">Total Líquido</span>
                    <p className="text-2xl font-bold text-[#22c55e]">R$ 32.000,00</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#3a3a3a]">
                  <div className="flex items-center space-x-2 bg-[#f5f0e0]/60 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Hidrojateamento, fundo e textura automáticos</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-[#f5f0e0]/60 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span>Pagamento quinzenal e validade inclusos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEMA VS SOLUÇÃO (Clay Card Comparison) */}
      <section className="py-20 px-4 bg-[#faf5e8] border-b border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] bg-[#f5f0e0] border border-[#e5e5e5] px-3 py-1 rounded-full">
              Comparativo de Mercado
            </span>
            <h2 className="text-3xl font-medium text-[#0a0a0a] tracking-tight">
              O Jeito Antigo vs. O Jeito Profissional
            </h2>
            <p className="text-sm text-[#6a6a6a]">
              Veja por que os profissionais que usam a plataforma fecham contratos com valores maiores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* O Jeito Antigo */}
            <div className="bg-[#fffaf0] p-7 rounded-3xl border border-[#e5e5e5] space-y-4">
              <div className="flex items-center space-x-2 text-[#ef4444] font-bold text-sm">
                <XCircle className="w-5 h-5" />
                <span>Como você perde contratos hoje</span>
              </div>
              <ul className="space-y-3.5 text-xs text-[#3a3a3a]">
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#ef4444] font-bold">•</span>
                  <span>Orçamento digitado no WhatsApp que parece informal e abre brecha para o cliente pedir desconto agressivo.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#ef4444] font-bold">•</span>
                  <span>Horas calculando metragens e redigindo procedimentos técnicos no computador depois de um dia exaustivo de obra.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#ef4444] font-bold">•</span>
                  <span>Cliente visualiza o PDF e some por dias sem você saber se ele leu ou se esqueceu.</span>
                </li>
              </ul>
            </div>

            {/* O Jeito Novo */}
            <div className="bg-[#fffaf0] p-7 rounded-3xl border-2 border-[#1a3a3a] shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-[#1a3a3a] font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                <span>Com o Proposta do Pintor</span>
              </div>
              <ul className="space-y-3.5 text-xs text-[#1a1a1a]">
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#22c55e] font-bold">•</span>
                  <span>Documento corporativo impecável com layout formal que transmite confiança e autoridade imediata.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#22c55e] font-bold">•</span>
                  <span>Injeção automática do processo técnico ao selecionar a área (paredes, portas, fachadas, muros).</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-[#22c55e] font-bold">•</span>
                  <span>Proposta pronta em menos de 3 minutos direto do celular ainda no local da visita técnica.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECURSOS EM PALETA CLAY SATURADA (6-Color Saturated Feature Cards) */}
      <section className="py-24 px-4 bg-[#fffaf0]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-[#0a0a0a] uppercase tracking-wider bg-[#f5f0e0] border border-[#e5e5e5] px-3.5 py-1 rounded-full">
              Recursos de Alta Conversão
            </span>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0a0a0a]">
              Tudo o que você precisa para transformar visitas em contratos assinados
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Brand Pink */}
            <div className="p-8 rounded-3xl bg-[#ff4d8b] text-white flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-white/20 rounded-2xl w-fit">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold">Catálogo em 3 Níveis</h3>
                <p className="text-xs leading-relaxed text-white/90">
                  Selecione se é Fachada, Portas ou Paredes e o sistema preenche todas as etapas técnicas de lixamento, fundos e demãos.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20 text-[11px] font-bold tracking-wide">
                Zero digitação repetitiva
              </div>
            </div>

            {/* Card 2: Brand Teal */}
            <div className="p-8 rounded-3xl bg-[#1a3a3a] text-white flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-white/15 rounded-2xl w-fit">
                  <PenTool className="w-6 h-6 text-[#a4d4c5]" />
                </div>
                <h3 className="text-lg font-bold">Assinatura Digital Touch</h3>
                <p className="text-xs leading-relaxed text-white/90">
                  O cliente assina a proposta com o dedo na tela do celular e recebe o carimbo de aceite digital com validade jurídica.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20 text-[11px] font-bold text-[#a4d4c5] tracking-wide">
                Fechamento imediato
              </div>
            </div>

            {/* Card 3: Brand Ochre */}
            <div className="p-8 rounded-3xl bg-[#e8b94a] text-[#0a0a0a] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-[#0a0a0a]/10 rounded-2xl w-fit">
                  <Share2 className="w-6 h-6 text-[#0a0a0a]" />
                </div>
                <h3 className="text-lg font-bold">WhatsApp & PDF 1-Click</h3>
                <p className="text-xs leading-relaxed text-[#1a1a1a]">
                  Envie a mensagem comercial pronta direto no WhatsApp com link público e baixe o PDF de alta resolução com carimbo.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0a0a0a]/15 text-[11px] font-bold tracking-wide">
                Compartilhamento em 2 segundos
              </div>
            </div>

            {/* Card 4: Brand Lavender */}
            <div className="p-8 rounded-3xl bg-[#b8a4ed] text-[#0a0a0a] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-[#0a0a0a]/10 rounded-2xl w-fit">
                  <FileCheck className="w-6 h-6 text-[#0a0a0a]" />
                </div>
                <h3 className="text-lg font-bold">Precificação Híbrida</h3>
                <p className="text-xs leading-relaxed text-[#1a1a1a]">
                  Calcule por área individual ou valor fechado da obra com regras de parcelamento (quinzenal, 30/40/30) calculadas em tempo real.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0a0a0a]/15 text-[11px] font-bold tracking-wide">
                Cálculos à prova de erros
              </div>
            </div>

            {/* Card 5: Brand Peach */}
            <div className="p-8 rounded-3xl bg-[#ffb084] text-[#0a0a0a] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-[#0a0a0a]/10 rounded-2xl w-fit">
                  <ShieldCheck className="w-6 h-6 text-[#0a0a0a]" />
                </div>
                <h3 className="text-lg font-bold">Contas & Dados Isolados</h3>
                <p className="text-xs leading-relaxed text-[#1a1a1a]">
                  Cada pintor possui seu login seguro com criptografia militar. Seus clientes e valores permanecem 100% confidenciais.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#0a0a0a]/15 text-[11px] font-bold tracking-wide">
                Segurança Multi-Tenant
              </div>
            </div>

            {/* Card 6: Warm Cream Card */}
            <div className="p-8 rounded-3xl bg-[#f5f0e0] text-[#0a0a0a] border border-[#e5e5e5] flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="p-3 bg-[#0a0a0a]/10 rounded-2xl w-fit">
                  <Zap className="w-6 h-6 text-[#0a0a0a]" />
                </div>
                <h3 className="text-lg font-bold">PDF Sem Marca d'Água</h3>
                <p className="text-xs leading-relaxed text-[#3a3a3a]">
                  Propostas geradas com o visual da sua própria marca, dados da sua empresa e chave Pix para recebimento instantâneo.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#e5e5e5] text-[11px] font-bold tracking-wide">
                100% White-Label no Plano Pro
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TABELA DE PREÇOS */}
      <PricingTable onSelectPlan={onSelectPlan} />

      {/* 5. FAQ (Clay Surface Soft) */}
      <section className="py-20 px-4 bg-[#faf5e8] border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] bg-[#f5f0e0] border border-[#e5e5e5] px-3 py-1 rounded-full">
              Dúvidas
            </span>
            <h2 className="text-3xl font-medium text-[#0a0a0a] tracking-tight">Perguntas Frequentes</h2>
            <p className="text-sm text-[#6a6a6a]">Tire todas as suas dúvidas antes de começar</p>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-[#e5e5e5] bg-[#fffaf0]">
              <h3 className="font-bold text-sm text-[#0a0a0a]">
                O que acontece se eu atingir o limite de propostas no mês?
              </h3>
              <p className="text-xs text-[#3a3a3a] mt-2 leading-relaxed">
                Você pode fazer o upgrade instantâneo para um plano maior pagando apenas a diferença proporcional, 
                ou aguardar a virada do seu ciclo mensal para receber novas propostas.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#e5e5e5] bg-[#fffaf0]">
              <h3 className="font-bold text-sm text-[#0a0a0a]">
                Quais são as formas de pagamento aceitas para os planos?
              </h3>
              <p className="text-xs text-[#3a3a3a] mt-2 leading-relaxed">
                Aceitamos Cartão de Crédito e Pix com ativação imediata. Sem burocracia ou taxas adicionais.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#e5e5e5] bg-[#fffaf0]">
              <h3 className="font-bold text-sm text-[#0a0a0a]">
                Preciso cadastrar cartão de crédito para usar a proposta grátis?
              </h3>
              <p className="text-xs text-[#3a3a3a] mt-2 leading-relaxed">
                Não! O plano gratuito permite criar e testar 1 proposta completa sem qualquer necessidade de cartão.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA FINAL (Clay Illustrated CTA Band) */}
      <section className="py-20 px-4 bg-[#fffaf0] text-center border-t border-[#e5e5e5]">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#0a0a0a]">
            Comece a fechar propostas profissionais hoje mesmo
          </h2>
          <p className="text-[#3a3a3a] text-sm sm:text-base leading-relaxed">
            Experimente gratuitamente e veja a reação do seu cliente ao receber uma proposta com o <strong>Proposta do Pintor</strong>.
          </p>
          <button
            onClick={onGoToApp}
            className="px-9 py-4 rounded-xl font-bold text-sm bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white shadow-md transition-all inline-flex items-center space-x-2"
          >
            <span>Acessar o Proposta do Pintor Agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Rodapé Warm Cream (Clay never uses dark footer) */}
        <div className="mt-16 pt-8 border-t border-[#e5e5e5] text-xs text-[#6a6a6a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Proposta do Pintor — Todos os direitos reservados.</p>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => openLegal('terms')}
              className="text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors underline-offset-4 hover:underline"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              onClick={() => openLegal('privacy')}
              className="text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors underline-offset-4 hover:underline"
            >
              Política de Privacidade (LGPD)
            </button>
          </div>
        </div>
      </section>

      {/* Modal Jurídico LGPD / Termos */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};
