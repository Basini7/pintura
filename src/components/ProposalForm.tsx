import React, { useState, useEffect } from 'react';
import { Proposal, WorkAreaConfig, SelectedAreaScope, ProviderProfile, PricingMode, UserSubscription, User, ClientInfo } from '../types.js';
import { AreaSelectorModal } from './AreaSelectorModal.js';
import { api } from '../services/api.js';
import { generateWhatsAppMessage, openWhatsAppLink } from '../utils/whatsappShare.js';
import { generateProposalPDF } from '../utils/pdfGenerator.js';
import { maskPhone } from '../utils/masks.js';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Share2, 
  Download, 
  Save, 
  DollarSign, 
  Layers, 
  Calendar,
  AlertCircle,
  Eye,
  Zap,
  Lock
} from 'lucide-react';

type ProposalStep = 'client' | 'services' | 'pricing' | 'terms' | 'review';

interface ProposalFormProps {
  initialProposal?: Proposal | null;
  defaultStep?: ProposalStep;
  catalog: WorkAreaConfig[];
  profile: ProviderProfile;
  subscription?: UserSubscription | null;
  user?: User | null;
  onSaved: (proposal: Proposal) => void;
  onOpenUpgrade?: () => void;
  onRequireAuth?: () => void;
}

export const ProposalForm: React.FC<ProposalFormProps> = ({
  initialProposal,
  defaultStep = 'client',
  catalog,
  profile,
  subscription,
  user,
  onSaved,
  onOpenUpgrade,
  onRequireAuth,
}) => {
  const [proposal, setProposal] = useState<Proposal>(() => {
    if (initialProposal) return initialProposal;
    return {
      id: `prop-${Date.now()}`,
      proposalNumber: 'NOVA PROPOSTA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'DRAFT',
      client: {
        name: '',
        phone: '',
        address: '',
        city: '',
      },
      areas: [],
      pricing: {
        mode: 'GLOBAL',
        totalAmount: 0,
        discount: 0,
        netAmount: 0,
      },
      terms: {
        includesMaterials: false,
        paymentCondition: 'A combinar entre as partes',
        withInvoice: false,
        validityDays: 30,
        generalNotes: '',
      },
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [globalPriceInput, setGlobalPriceInput] = useState<string>(() => {
    return proposal.pricing.totalAmount > 0
      ? proposal.pricing.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '';
  });
  const [discountInput, setDiscountInput] = useState<string>(() => {
    return proposal.pricing.discount > 0
      ? proposal.pricing.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '';
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [activeStep, setActiveStep] = useState<ProposalStep>(defaultStep);

  const recentClientsStorageKey = `pintura_recent_clients_${user?.id || 'guest'}`;

  const getStoredRecentClients = (): ClientInfo[] => {
    if (typeof window === 'undefined') return [];

    try {
      const raw = window.localStorage.getItem(recentClientsStorageKey);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as ClientInfo[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const [recentClients, setRecentClients] = useState<ClientInfo[]>(getStoredRecentClients);

  const persistRecentClient = (client: ClientInfo) => {
    if (!client.name?.trim()) return;

    const normalized: ClientInfo = {
      name: client.name.trim(),
      phone: client.phone?.trim() || '',
      email: client.email?.trim() || '',
      address: client.address?.trim() || '',
      city: client.city?.trim() || '',
      propertyType: client.propertyType || 'Casa',
      notes: client.notes?.trim() || '',
    };

    setRecentClients((prev) => {
      const deduped = [normalized, ...prev.filter((item) => {
        const sameName = item.name.toLowerCase() === normalized.name.toLowerCase();
        const sameAddress = (item.address || '').toLowerCase() === (normalized.address || '').toLowerCase();
        return !(sameName && sameAddress);
      })].slice(0, 5);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(recentClientsStorageKey, JSON.stringify(deduped));
      }

      return deduped;
    });
  };

  const filteredClients = recentClients.filter((client) => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return true;
    return `${client.name} ${client.city} ${client.address}`.toLowerCase().includes(q);
  });

  const steps = [
    { id: 'client', label: 'Cliente' },
    { id: 'services', label: 'Serviços' },
    { id: 'pricing', label: 'Valores' },
    { id: 'terms', label: 'Condições' },
    { id: 'review', label: 'Revisão' },
  ] as const;

  const currentStepIndex = steps.findIndex((step) => step.id === activeStep);

  // Recalcular totais sempre que as áreas, modo ou inputs de valor mudarem
  useEffect(() => {
    const rawGlobal = parseFloat(globalPriceInput.replace(/\./g, '').replace(',', '.')) || 0;
    const rawDiscount = parseFloat(discountInput.replace(/\./g, '').replace(',', '.')) || 0;

    api.calculatePricing({
      mode: proposal.pricing.mode,
      areas: proposal.areas,
      globalAmount: rawGlobal,
      discountNominal: rawDiscount,
      paymentCondition: proposal.terms.paymentCondition,
    }).then(({ summary }) => {
      setProposal((prev) => ({
        ...prev,
        pricing: summary,
      }));
    }).catch(console.error);
  }, [proposal.pricing.mode, proposal.areas, globalPriceInput, discountInput, proposal.terms.paymentCondition]);

  const handleAddArea = async (areaId: string, options: any) => {
    const newScope = await api.resolveScope(areaId, options);
    setProposal((prev) => ({
      ...prev,
      areas: [...prev.areas, newScope],
    }));
    setIsModalOpen(false);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickAddArea = async (areaId: string) => {
    try {
      const scope = await api.resolveScope(areaId);
      setProposal((prev) => ({
        ...prev,
        areas: [...prev.areas, scope],
      }));
      showToast(`Área "${scope.areaName}" adicionada com processo padrão!`);
    } catch {
      alert('Erro ao adicionar área');
    }
  };

  const handleSaveRecentClient = () => {
    const currentClient = proposal.client;
    if (!currentClient.name.trim()) {
      alert('Preencha pelo menos o nome do cliente antes de salvar como recente.');
      return;
    }

    persistRecentClient(currentClient);
    showToast('Cliente e imóvel salvos para reutilização.');
  };

  const handleLoadExample = async () => {
    try {
      const [fachada, paredes] = await Promise.all([
        api.resolveScope('fachada_externa', {
          cleaningMethod: 'Hidrojateamento',
          finishType: 'Textura Granfino Hidro-repelente',
          includeBurnedCement: true,
        }),
        api.resolveScope('paredes'),
      ]);

      setProposal((prev) => ({
        ...prev,
        client: {
          name: 'Cliente Exemplo (Demonstração)',
          phone: '',
          address: 'Av. das Flores, 500 – Bloco A',
          city: 'Cidade Exemplo',
        },
        areas: [fachada, paredes],
        pricing: {
          mode: 'GLOBAL',
          totalAmount: 18500,
          discount: 0,
          netAmount: 18500,
        },
        terms: {
          includesMaterials: false,
          paymentCondition: '30% de entrada, restante na conclusão dos serviços',
          withInvoice: false,
          validityDays: 30,
        },
      }));
      setGlobalPriceInput('18.500,00');
      showToast('Exemplo demonstrativo carregado com sucesso!');
    } catch {
      alert('Erro ao carregar exemplo');
    }
  };

  const handleRemoveArea = (index: number) => {
    setProposal((prev) => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateStepText = (areaIndex: number, stepIndex: number, newText: string) => {
    setProposal((prev) => {
      const updatedAreas = [...prev.areas];
      const updatedSteps = [...updatedAreas[areaIndex].steps];
      updatedSteps[stepIndex] = newText;
      updatedAreas[areaIndex] = { ...updatedAreas[areaIndex], steps: updatedSteps };
      return { ...prev, areas: updatedAreas };
    });
  };

  const handleSave = async (): Promise<Proposal | null> => {
    if (!proposal.client.name.trim()) {
      alert('Por favor, preencha o nome do cliente.');
      return null;
    }
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert('Crie sua conta ou faça login para salvar sua proposta.');
      }
      return null;
    }
    setSaving(true);
    try {
      const saved = await api.saveProposal(proposal);
      setProposal(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast('Proposta salva com sucesso!');
      onSaved(saved);
      return saved;
    } catch (err: any) {
      if (err.code === 'QUOTA_EXCEEDED') {
        if (onOpenUpgrade) {
          onOpenUpgrade();
        } else {
          alert(err.message || 'Limite de propostas do plano atingido.');
        }
      } else {
        alert(err.message || 'Erro ao salvar proposta.');
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!proposal.client.name.trim()) {
      alert('Preencha o nome do cliente antes de gerar a mensagem.');
      return;
    }
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert('Crie sua conta gratuita ou faça login para enviar propostas pelo WhatsApp.');
      }
      return;
    }

    const isNew = !initialProposal || proposal.proposalNumber === 'NOVA PROPOSTA';
    const isQuotaExceeded = !!(subscription && subscription.monthlyLimit !== -1 && subscription.usedProposalsCount >= subscription.monthlyLimit);

    if (isNew && isQuotaExceeded) {
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        alert('Limite de propostas do plano atingido. Faça upgrade para continuar!');
      }
      return;
    }

    // Salvar antes de enviar se for nova proposta para registrar no histórico e debitar da cota
    let currentProposal = proposal;
    if (isNew) {
      const saved = await handleSave();
      if (!saved) return;
      currentProposal = saved;
    }

    const msg = generateWhatsAppMessage(currentProposal, profile);
    openWhatsAppLink(currentProposal.client.phone, msg);
    showToast('Mensagem formatada copiada e abrindo WhatsApp...');
  };

  const handlePDF = async () => {
    if (!proposal.client.name.trim()) {
      alert('Preencha o nome do cliente antes de gerar o PDF.');
      return;
    }
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        alert('Crie sua conta gratuita (1 proposta inclusa) ou faça login para exportar em PDF.');
      }
      return;
    }

    const isNew = !initialProposal || proposal.proposalNumber === 'NOVA PROPOSTA';
    const isQuotaExceeded = !!(subscription && subscription.monthlyLimit !== -1 && subscription.usedProposalsCount >= subscription.monthlyLimit);

    if (isNew && isQuotaExceeded) {
      if (onOpenUpgrade) {
        onOpenUpgrade();
      } else {
        alert('Limite de propostas do plano atingido. Faça upgrade para continuar!');
      }
      return;
    }

    // Salvar antes de gerar PDF se for nova proposta para garantir cota e integridade
    let currentProposal = proposal;
    if (isNew) {
      const saved = await handleSave();
      if (!saved) return;
      currentProposal = saved;
    }

    generateProposalPDF(currentProposal, profile, subscription?.hasWatermark ?? true);
    showToast('Download do PDF formal iniciado!');
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Banner de Limite Atingido / Upgrade */}
      {subscription && subscription.monthlyLimit !== -1 && subscription.usedProposalsCount >= subscription.monthlyLimit && (!initialProposal || proposal.proposalNumber === 'NOVA PROPOSTA') && (
        <div className="bg-[#fff3cd] border border-[#ffeeba] text-[#856404] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-[#856404] shrink-0" />
            <div>
              <p className="font-bold text-sm">Limite de propostas atingido ({subscription.usedProposalsCount}/{subscription.monthlyLimit})</p>
              <p className="text-xs text-[#856404]/90">Você atingiu a cota mensal do seu plano. Faça upgrade para gerar e exportar propostas ilimitadas.</p>
            </div>
          </div>
          <button
            onClick={onOpenUpgrade}
            className="px-4 py-2 bg-[#0a0a0a] text-white rounded-xl text-xs font-bold hover:bg-[#222] transition shrink-0 flex items-center space-x-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#ffb084]" />
            <span>Fazer Upgrade Agora</span>
          </button>
        </div>
      )}

      {/* Banner para Visitante Não Logado */}
      {!user && (
        <div className="bg-[#f0f9ff] border border-[#bae6fd] text-[#0369a1] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <Lock className="w-6 h-6 text-[#0369a1] shrink-0" />
            <div>
              <p className="font-bold text-sm">Modo de Degustação</p>
              <p className="text-xs text-[#0369a1]/90">Cadastre-se gratuitamente para salvar e exportar sua proposta em PDF com 1 proposta inclusa sem custos.</p>
            </div>
          </div>
          <button
            onClick={onRequireAuth}
            className="px-4 py-2 bg-[#0a0a0a] text-white rounded-xl text-xs font-bold hover:bg-[#222] transition shrink-0"
          >
            Criar Conta Gratuita
          </button>
        </div>
      )}

      {/* Barra de Ações do Topo */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
            {proposal.proposalNumber}
          </span>
          <h2 className="text-lg font-bold text-slate-800 mt-1">Nova Proposta</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadExample}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 shadow-sm transition-all"
            title="Preencher instantaneamente com dados reais de exemplo"
          >
            <span>✨ Exemplo Pronto</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar'}</span>
          </button>

          {proposal.publicToken && (
            <button
              type="button"
              onClick={() => {
                window.location.hash = `proposta=${proposal.publicToken}`;
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all"
              title="Visualizar Proposta Interativa como Cliente"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Online</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Gerar PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const isDone = index < currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                }`}>
                  {index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.75fr)_320px] gap-6">
        <div className="space-y-6">
          {activeStep === 'client' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-800">1. Cliente e Local da Obra</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Buscar cliente</label>
                    <input
                      type="text"
                      placeholder="Digite o nome do cliente ou endereço"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Clientes recentes</p>
                    {filteredClients.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {filteredClients.map((client) => (
                          <button
                            key={`${client.name}-${client.address}`}
                            type="button"
                            onClick={() => {
                              setClientQuery(client.name);
                              const selectedClient: ClientInfo = {
                                name: client.name,
                                phone: client.phone || '',
                                address: client.address,
                                city: client.city || '',
                                propertyType: client.propertyType || 'Casa',
                              };
                              setProposal((prev) => ({
                                ...prev,
                                client: {
                                  ...prev.client,
                                  ...selectedClient,
                                },
                              }));
                              persistRecentClient(selectedClient);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-slate-800">{client.name}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{client.propertyType}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-600">{client.address}</p>
                            <p className="text-[11px] text-slate-500">{client.phone}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-500">Nenhum cliente salvo.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-800">Dados do cliente e imóvel</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextName = clientQuery.trim() || 'Novo Cliente';
                        setProposal((prev) => ({
                          ...prev,
                          client: {
                            ...prev.client,
                            name: nextName,
                          },
                        }));
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Usar busca
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecentClient}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Salvar como cliente recente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nome do Cliente / Contratante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva / Condomínio Alpha"
                      value={proposal.client.name}
                      onChange={(e) => {
                        setClientQuery(e.target.value);
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, name: e.target.value },
                        }));
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(11) 90000-0000"
                      maxLength={15}
                      value={proposal.client.phone || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, phone: maskPhone(e.target.value) },
                        }))
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={proposal.client.email || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, email: e.target.value },
                        }))
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={proposal.client.city || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, city: e.target.value },
                        }))
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço da Obra</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Principal, 100 – Centro"
                      value={proposal.client.address}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, address: e.target.value },
                        }))
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de imóvel</label>
                    <div className="flex flex-wrap gap-2">
                      {['Casa', 'Sobrado', 'Apartamento', 'Comercial', 'Outro'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setProposal((prev) => ({
                              ...prev,
                              client: { ...prev.client, propertyType: type as any },
                            }))
                          }
                          className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${
                            proposal.client.propertyType === type
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
                    <textarea
                      rows={3}
                      value={proposal.client.notes || ''}
                      onChange={(e) =>
                        setProposal((prev) => ({
                          ...prev,
                          client: { ...prev.client, notes: e.target.value },
                        }))
                      }
                      placeholder="Informações úteis para a obra, acesso, horários, preferências ou observações do cliente"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:bg-white bg-slate-50 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'services' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-800">2. Áreas de Trabalho e Escopo Técnico</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Catálogo Completo</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Áreas</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{proposal.areas.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Categorias</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{new Set(proposal.areas.map((item) => item.category)).size}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Etapas</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{proposal.areas.reduce((sum, area) => sum + area.steps.length, 0)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Adicionar em 1 clique:
                  </span>
                  {[
                    { id: 'fachada_externa', label: 'Fachada Externa' },
                    { id: 'paredes', label: 'Paredes' },
                    { id: 'muros', label: 'Muros' },
                    { id: 'portas', label: 'Portas' },
                    { id: 'tetos', label: 'Tetos' },
                    { id: 'calhas', label: 'Calhas & Rufos' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleQuickAddArea(item.id)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors font-semibold flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 text-blue-500" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-800">Resumo do escopo</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Escopo sugerido</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Áreas selecionadas</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{proposal.areas.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Etapas técnicas</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{proposal.areas.reduce((sum, area) => sum + area.steps.length, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{proposal.areas.length === 0 ? 'Sem escopo' : 'Pronto para revisar'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-800">Áreas selecionadas</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-800"
                  >
                    Adicionar mais
                  </button>
                </div>

                {proposal.areas.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">Nenhuma área adicionada ainda.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em "Adicionar Área" para carregar automaticamente o roteiro técnico (paredes, fachadas, muros, etc.).
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm inline-flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Primeira Área</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposal.areas.map((area, aIdx) => (
                      <div key={aIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                        <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded uppercase">
                              {area.category.replace('_', ' ')}
                            </span>
                            <h4 className="font-bold text-xs text-slate-800">{area.areaName}</h4>
                            {area.price ? (
                              <span className="text-xs font-semibold text-emerald-700 ml-2">
                                {formatBRL(area.price)}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveArea(aIdx)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors"
                            title="Remover Área"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span>{area.steps.length} etapas sugeridas</span>
                            <button
                              type="button"
                              className="font-bold text-blue-700 hover:text-blue-800"
                            >
                              Editar escopo
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {area.steps.map((step, sIdx) => (
                              <div key={sIdx} className="flex items-start space-x-2">
                                <span className="text-blue-500 font-bold text-xs mt-1">•</span>
                                <input
                                  type="text"
                                  value={step}
                                  onChange={(e) => handleUpdateStepText(aIdx, sIdx, e.target.value)}
                                  className="flex-1 text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 'pricing' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">3. Precificação e Composição de Valores</h3>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Resumo financeiro</p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">Valor da proposta</h4>
                  </div>
                  <span className="text-2xl font-black text-slate-900">{formatBRL(proposal.pricing.netAmount)}</span>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-slate-500">Subtotal</p>
                    <p className="mt-2 text-base font-black text-slate-900">{formatBRL(proposal.pricing.totalAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-slate-500">Desconto aplicado</p>
                    <p className="mt-2 text-base font-black text-slate-900">{formatBRL(proposal.pricing.discount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-slate-500">Pagamento</p>
                    <p className="mt-2 text-base font-black text-slate-900">{proposal.terms.paymentCondition || 'A combinar'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modo de Precificação:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setProposal((prev) => ({
                          ...prev,
                          pricing: { ...prev.pricing, mode: 'GLOBAL' },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        proposal.pricing.mode === 'GLOBAL'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Valor Global Fechado
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProposal((prev) => ({
                          ...prev,
                          pricing: { ...prev.pricing, mode: 'BY_AREA' },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        proposal.pricing.mode === 'BY_AREA'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Somar por Área
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Escopo de Fornecimento:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setProposal((prev) => ({
                          ...prev,
                          terms: { ...prev.terms, includesMaterials: false },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        !proposal.terms.includesMaterials
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Apenas Mão de Obra
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProposal((prev) => ({
                          ...prev,
                          terms: { ...prev.terms, includesMaterials: true },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        proposal.terms.includesMaterials
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Mão de Obra + Material
                    </button>
                  </div>
                </div>

                {proposal.pricing.mode === 'GLOBAL' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Valor Total da Proposta (R$):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="text"
                        placeholder="Ex: 32.000,00"
                        value={globalPriceInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          if (!raw) {
                            setGlobalPriceInput('');
                            return;
                          }
                          const num = parseInt(raw, 10) / 100;
                          setGlobalPriceInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                        }}
                        className="w-full text-sm p-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Soma das Áreas Cadastradas:</span>
                      <p className="text-base font-bold text-slate-800">
                        {formatBRL(proposal.pricing.totalAmount)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Desconto Nominal (R$):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={discountInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (!raw) {
                          setDiscountInput('');
                          return;
                        }
                        const num = parseInt(raw, 10) / 100;
                        setDiscountInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                      }}
                      className="w-full text-xs p-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    {proposal.terms.includesMaterials ? 'Total Mão de Obra + Material' : 'Total Mão de Obra'}
                  </span>
                  <p className="text-2xl font-black text-slate-900">
                    {formatBRL(proposal.pricing.netAmount)}
                  </p>
                </div>
                {!proposal.terms.includesMaterials && (
                  <span className="text-xs font-medium text-slate-500 italic hidden sm:inline">
                    Materiais por conta do contratante
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Condições de pagamento</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    '50% de entrada + 50% na conclusão',
                    '30% entrada + 40% meio da obra + 30% na entrega',
                    'A combinar entre as partes',
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setProposal((prev) => ({
                        ...prev,
                        terms: { ...prev.terms, paymentCondition: option },
                      }))}
                      className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${
                        proposal.terms.paymentCondition === option
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStep === 'terms' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">4. Condições Comerciais e Cláusulas</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Forma de Pagamento (Atalhos Rápidos):
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    'A combinar entre as partes',
                    'A cada duas semanas (até no máximo Quinta-feira)',
                    '30% entrada + 40% meio da obra + 30% na entrega',
                    '50% de entrada + 50% na conclusão',
                  ].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() =>
                        setProposal((prev) => ({
                          ...prev,
                          terms: { ...prev.terms, paymentCondition: cond },
                        }))
                      }
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        proposal.terms.paymentCondition === cond
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={proposal.terms.paymentCondition}
                  onChange={(e) =>
                    setProposal((prev) => ({
                      ...prev,
                      terms: { ...prev.terms, paymentCondition: e.target.value },
                    }))
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Ou digite uma condição personalizada..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <input
                    type="checkbox"
                    checked={!proposal.terms.withInvoice}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        terms: { ...prev.terms, withInvoice: !e.target.checked },
                      }))
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-semibold">Inserir observação "Sem NF"</span>
                </label>

                <div className="flex items-center space-x-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-600">Validade da Proposta:</span>
                  <input
                    type="number"
                    value={proposal.terms.validityDays}
                    onChange={(e) =>
                      setProposal((prev) => ({
                        ...prev,
                        terms: { ...prev.terms, validityDays: parseInt(e.target.value, 10) || 30 },
                      }))
                    }
                    className="w-16 text-xs p-1.5 text-center font-bold border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-xs text-slate-600 font-medium">dias</span>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'review' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Revisão</p>
                  <h3 className="font-bold text-sm text-slate-800 mt-1">Checklist final da proposta</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('pricing')}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Editar valores
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep('terms')}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Revisar condições
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm text-slate-700">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Cliente e imóvel</p>
                  <p className="mt-2 font-bold text-slate-800">{proposal.client.name || 'Cliente não informado'}</p>
                  <p className="mt-1 text-slate-600">{proposal.client.phone || 'Telefone não informado'}</p>
                  <p className="text-slate-600">{proposal.client.address || 'Endereço não informado'}</p>
                  <p className="text-slate-500 text-[11px] mt-2">{proposal.client.city || 'Cidade não informada'} · {proposal.client.propertyType || 'Tipo não informado'}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Escopo e serviços</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proposal.areas.length ? proposal.areas.map((area, idx) => (
                      <span key={idx} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {area.areaName}
                      </span>
                    )) : <span className="text-slate-500">Nenhuma área adicionada</span>}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Valor e condições</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{formatBRL(proposal.pricing.netAmount)}</p>
                  <p className="mt-1 text-slate-600">{proposal.terms.paymentCondition || 'Pagamento a combinar'}</p>
                  <p className="text-[11px] text-slate-500">Validade: {proposal.terms.validityDays} dias</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Checklist final</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-600">✓</span><span>Cliente e imóvel preenchidos corretamente.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-600">✓</span><span>Escopo e serviços foram revisados e ajustados.</span></li>
                  <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-600">✓</span><span>Valor, desconto e condições de pagamento conferem com o fechamento comercial.</span></li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  Enviar por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handlePDF}
                  className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Gerar PDF final
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 h-fit">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Resumo</p>
              <h3 className="mt-1 text-base font-black text-slate-900">Total da proposta</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Cliente</span>
                <span className="font-semibold text-slate-900">{proposal.client.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Serviços</span>
                <span className="font-semibold text-slate-900">{proposal.areas.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Desconto</span>
                <span className="font-semibold text-slate-900">{formatBRL(proposal.pricing.discount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pagamento</span>
                <span className="font-semibold text-slate-900 text-right max-w-[150px]">{proposal.terms.paymentCondition || 'A combinar'}</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Valor final</p>
              <p className="mt-1 text-2xl font-black">{formatBRL(proposal.pricing.netAmount)}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveStep('review')}
              className="w-full rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Revisar proposta
            </button>
          </div>
        </aside>
      </div>

      {/* Modal de Seleção de Áreas */}
      {isModalOpen && (
        <AreaSelectorModal
          catalog={catalog}
          onAddArea={handleAddArea}
          onClose={() => setIsModalOpen(false)}
          selectedAreaIds={proposal.areas.map((a) => a.areaId)}
        />
      )}

      {/* Toast Flutuante de Feedback CRO */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
