import React, { useState, useEffect, useRef } from 'react';
import { Proposal, ProviderProfile } from '../types.js';
import { api } from '../services/api.js';
import { generateProposalPDF } from '../utils/pdfGenerator.js';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Share2, 
  Calendar, 
  MapPin, 
  User, 
  CreditCard, 
  ShieldCheck, 
  PenTool, 
  RotateCcw, 
  Check, 
  ArrowLeft,
  Eye,
  Copy
} from 'lucide-react';

interface PublicProposalViewerProps {
  proposalId: string;
  onBack?: () => void;
}

export const PublicProposalViewer: React.FC<PublicProposalViewerProps> = ({ proposalId, onBack }) => {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [hasWatermark, setHasWatermark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Assinatura
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canvas de Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasStrokesRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [propData, profData, subData] = await Promise.all([
          api.getProposal(proposalId),
          api.getProfile().catch(() => null),
          api.getSubscription().catch(() => null),
        ]);

        setProposal(propData);
        setProfile(profData);
        if (subData) {
          setHasWatermark(subData.hasWatermark);
        }
        setSignerName(propData.client.name || '');

        // Registrar visualização automaticamente
        try {
          const viewedProp = await api.trackProposalView(proposalId);
          setProposal(viewedProp);
        } catch (e) {
          console.warn('Não foi possível registrar contagem de visualização:', e);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Não foi possível carregar a proposta';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (proposalId) {
      loadData();
    }
  }, [proposalId]);

  // Funções do Canvas de Assinatura
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    hasStrokesRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokesRef.current = false;
  };

  const handleConfirmSignature = async () => {
    if (!signerName.trim()) {
      showToast('Por favor, informe o nome completo para assinatura.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !hasStrokesRef.current) {
      showToast('Por favor, faça sua assinatura digital no quadro abaixo.');
      return;
    }

    try {
      setIsSigning(true);
      const signatureDataUrl = canvas.toDataURL('image/png');
      const updated = await api.approveProposal(proposalId, {
        signerName: signerName.trim(),
        signature: signatureDataUrl,
      });

      setProposal(updated);
      setIsSignModalOpen(false);
      showToast('🎉 Parabéns! Proposta aprovada e assinada com sucesso.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao confirmar assinatura';
      showToast(`Erro: ${msg}`);
    } finally {
      setIsSigning(false);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Link da proposta copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppContact = () => {
    if (!proposal) return;
    const phone = profile?.phones?.[0]?.replace(/\D/g, '') || '';
    const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const text = encodeURIComponent(
      `Olá! Estou visualizando a proposta ${proposal.proposalNumber} para a obra em ${proposal.client.address || proposal.client.name}. Gostaria de tirar algumas dúvidas.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Carregando proposta interativa...</h2>
        <p className="text-sm text-slate-500 mt-1">Buscando detalhes do orçamento com segurança</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">!</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Proposta não encontrada</h2>
        <p className="text-slate-600 max-w-md mb-6">{error || 'O link que você tentou acessar pode ter expirado ou estar incorreto.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </button>
        )}
      </div>
    );
  }

  const isApproved = proposal.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 text-slate-800 py-6 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Top bar de navegação e ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-slate-700 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Sistema
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-700 rounded-lg text-xs sm:text-sm font-medium shadow-sm hover:bg-slate-50 transition border border-slate-200"
              title="Copiar link da proposta"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </button>
            <button
              onClick={() => profile && generateProposalPDF(proposal, profile, hasWatermark)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs sm:text-sm font-medium shadow-sm hover:bg-indigo-100 transition border border-indigo-200"
            >
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {isApproved ? (
          <div className="mb-6 bg-emerald-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 text-emerald-900 shadow-sm">
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg">Proposta Aprovada e Assinada Digitalmente!</h3>
              <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                Assinada por <strong>{proposal.signerName}</strong> em {formatDate(proposal.approvedAt)}. Contrato em conformidade e pronto para execução.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-ping shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Aguardando Aprovação
                  </span>
                  {proposal.viewCount && proposal.viewCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Eye className="w-3.5 h-3.5" /> {proposal.viewCount} {proposal.viewCount === 1 ? 'visualização' : 'visualizações'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Revise todos os itens e aprove diretamente na tela pelo seu celular ou computador.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSignModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 text-sm sm:text-base shrink-0"
            >
              <PenTool className="w-5 h-5" />
              Aprovar e Assinar Agora
            </button>
          </div>
        )}

        {/* Card Principal da Proposta */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header da Empresa */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-6">
              <div>
                <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">Proposta Comercial</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">{profile?.companyName || 'Proposta de Pintura & Reforma'}</h1>
                {profile?.phones && profile.phones.length > 0 && (
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">Fone: {profile.phones.join(' / ')}</p>
                )}
              </div>

              <div className="sm:text-right bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-300 block">Número do Registro</span>
                <span className="text-base sm:text-lg font-mono font-bold text-white">{proposal.proposalNumber}</span>
              </div>
            </div>

            {/* Metadados Cliente & Obra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6 text-sm">
              <div className="flex items-start gap-2.5">
                <User className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Cliente</span>
                  <strong className="text-white text-base">{proposal.client.name}</strong>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Local da Obra</span>
                  <span className="text-slate-200">{proposal.client.address || 'Conforme alinhado'}</span>
                  {proposal.client.city && <span className="text-slate-400 block text-xs">{proposal.client.city}</span>}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-slate-400 block">Emissão & Validade</span>
                  <span className="text-slate-200">{formatDate(proposal.createdAt)}</span>
                  <span className="text-amber-300 text-xs block font-medium">Válida por {proposal.terms.validityDays} dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Corpo do Documento */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Seção 1: Escopo e Áreas */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">1. Áreas de Atuação e Escopo Técnico</h2>
              </div>

              <div className="space-y-4">
                {proposal.areas.map((area, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-slate-800 text-base">{area.areaName}</h3>
                      </div>
                      {area.price && area.price > 0 && (
                        <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {formatBRL(area.price)}
                        </span>
                      )}
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 pt-1">
                      {area.steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção 2: Resumo Financeiro & Condições */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">2. Valores e Condições de Pagamento</h2>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-indigo-100">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 block">
                      {proposal.terms.includesMaterials ? 'Mão de Obra + Materiais Inclusos' : 'Mão de Obra Especializada'}
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                      {formatBRL(proposal.pricing.netAmount)}
                    </div>
                    {proposal.pricing.discount > 0 && (
                      <span className="inline-block mt-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        Economia aplicada de {formatBRL(proposal.pricing.discount)}
                      </span>
                    )}
                  </div>

                  <div className="text-sm space-y-1.5 md:text-right">
                    <p className="text-slate-600">
                      <strong>Materiais:</strong> {proposal.terms.includesMaterials ? 'Inclusos no valor' : 'Por conta do cliente'}
                    </p>
                    <p className="text-slate-600">
                      <strong>Forma de Pagamento:</strong> {proposal.terms.paymentCondition}
                    </p>
                    <p className="text-slate-600">
                      <strong>Emissão de Nota Fiscal:</strong> {proposal.terms.withInvoice ? 'Sim, inclusa' : 'A combinar'}
                    </p>
                  </div>
                </div>

                {/* Chave PIX */}
                {profile?.pixKey && (
                  <div className="mt-5 bg-white p-3.5 rounded-xl border border-indigo-200/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-900">🔑 Chave PIX para Entrada/Sinal:</span>
                      <code className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-mono font-medium">{profile.pixKey}</code>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(profile.pixKey || '');
                        showToast('Chave PIX copiada!');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Copiar Chave
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Observações Gerais */}
            {proposal.terms.generalNotes && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs sm:text-sm text-slate-600">
                <h4 className="font-bold text-slate-800 mb-1">Observações da Obra:</h4>
                <p className="whitespace-pre-line">{proposal.terms.generalNotes}</p>
              </div>
            )}

            {/* Assinatura Digital do Cliente (se aprovado) */}
            {isApproved && proposal.signature && (
              <div className="border border-emerald-300 bg-emerald-50/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3 text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base">Termo de Aceite e Assinatura Digital</h3>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm max-w-xs w-full">
                    <img 
                      src={proposal.signature} 
                      alt="Assinatura Digital do Cliente" 
                      className="h-24 w-full object-contain"
                    />
                    <div className="text-center border-t border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-xs font-semibold text-slate-700 block">{proposal.signerName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Assinado digitalmente</span>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                    <p><strong>Signatário:</strong> {proposal.signerName}</p>
                    <p><strong>Data do Aceite:</strong> {formatDate(proposal.approvedAt)}</p>
                    <p><strong>Autenticação:</strong> Válido juridicamente conforme MP 2.200-2/2001 e Código Civil Brasileiro.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé de Ações de Conversão */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Ambiente seguro com registro de visualização e aceite digital.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleWhatsAppContact}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition"
                >
                  Falar no WhatsApp
                </button>

                {!isApproved && (
                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition"
                  >
                    <PenTool className="w-4 h-4" />
                    Assinar Proposta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Marca d'água discreta para os planos gratuitos / básicos */}
        {hasWatermark && (
          <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 pb-6">
            <span>Orçamento gerado e protegido via</span>
            <a 
              href="/" 
              className="font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300"
            >
              Proposta do Pintor • Crie orçamentos grátis
            </a>
          </div>
        )}
      </div>

      {/* MODAL DE ASSINATURA DIGITAL */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 animate-scale-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Aprovar Proposta Digitalmente</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Assine com o dedo (no celular) ou com o mouse para formalizar o orçamento.
                </p>
              </div>
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nome Completo do Aprovador / Contratante
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ex: João Carlos da Silva"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Faça sua Assinatura no Quadro Abaixo
                  </label>
                  <button
                    onClick={clearCanvas}
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Limpar
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative touch-none">
                  <canvas
                    ref={canvasRef}
                    width={450}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 cursor-crosshair bg-white"
                  />
                  <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-slate-400 font-mono">
                    Área de assinatura
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Ao clicar em "Confirmar Aceite", você declara estar de acordo com o escopo, cronograma e valores especificados nesta proposta.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSigning}
                  onClick={handleConfirmSignature}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  {isSigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      Confirmar Aceite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
