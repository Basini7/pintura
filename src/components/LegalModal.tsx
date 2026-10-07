import React, { useState } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#fffaf0] rounded-3xl border border-[#e5e5e5] w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fffaf0]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ffb084]/20 flex items-center justify-center text-[#ff4d8b]">
              {tab === 'terms' ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a0a0a]">
                {tab === 'terms' ? 'Termos de Uso' : 'Política de Privacidade & LGPD'}
              </h2>
              <p className="text-xs text-[#5a5a5a]">Proposta do Pintor • Atualizado em 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-black/5 transition-all"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#e5e5e5] bg-white/50 px-6 pt-2">
          <button
            onClick={() => setTab('terms')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              tab === 'terms'
                ? 'border-[#0a0a0a] text-[#0a0a0a]'
                : 'border-transparent text-[#7a7a7a] hover:text-[#0a0a0a]'
            }`}
          >
            Termos de Uso
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              tab === 'privacy'
                ? 'border-[#0a0a0a] text-[#0a0a0a]'
                : 'border-transparent text-[#7a7a7a] hover:text-[#0a0a0a]'
            }`}
          >
            Privacidade & LGPD
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#3a3a3a] leading-relaxed">
          {tab === 'terms' ? (
            <>
              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">1. Objeto da Plataforma</h3>
                <p>
                  O <strong>Proposta do Pintor</strong> é uma ferramenta de software como serviço (SaaS) destinada a pintores, empreiteiros e profissionais da construção civil para geração, cálculo métrico, personalização e exportação de orçamentos e propostas comerciais em PDF e WhatsApp.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">2. Planos e Assinaturas</h3>
                <p>
                  Oferecemos modalidade gratuita de teste (1 proposta completa) e planos por assinatura mensal recorrente (Básico, Intermediário e Pro Ilimitado). O cancelamento pode ser solicitado a qualquer momento diretamente pelo suporte ou portal do cliente da plataforma de pagamento Kiwify.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">3. Garantia Legal e Direito de Arrependimento (CDC Art. 49)</h3>
                <p>
                  Conforme o Código de Defesa do Consumidor brasileiro, você possui até 7 (sete) dias corridos após a contratação inicial para solicitar o reembolso integral caso não fique satisfeito com a plataforma, sem burocracias.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">4. Responsabilidade sobre os Dados dos Orçamentos</h3>
                <p>
                  Os valores por metro quadrado, prazos e condições comerciais inseridos nas propostas geradas são de inteira responsabilidade do profissional contratante. O Proposta do Pintor disponibiliza calculadoras sugeridas, servindo como facilitador operacional.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">1. Conformidade com a LGPD (Lei nº 13.709/2018)</h3>
                <p>
                  O Proposta do Pintor respeita a privacidade de seus usuários e clientes. Coletamos apenas as informações estritamente necessárias para a prestação do serviço (nome, e-mail, telefone comercial e logotipo cadastrado).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">2. Segurança dos Dados</h3>
                <p>
                  As senhas são criptografadas com hash irreversível saltado (PBKDF2/SHA-512). As sessões utilizam tokens seguros e autenticação protegida contra ataques de força bruta e invasão. Seus dados cadastrais nunca são vendidos a terceiros.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">3. Processamento de Pagamentos</h3>
                <p>
                  As transações financeiras são processadas por intermediadores de pagamento certificados (Kiwify). Não armazenamos em nossos servidores dados sensíveis de cartões de crédito ou chaves privadas bancárias.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-sm text-[#0a0a0a]">4. Seus Direitos</h3>
                <p>
                  A qualquer momento, o usuário titular tem o direito de solicitar a exportação, retificação ou exclusão definitiva de sua conta e de suas propostas salvas na base de dados.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e5e5] flex justify-end bg-[#fffaf0]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#0a0a0a] text-white hover:bg-[#222] transition-all"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
