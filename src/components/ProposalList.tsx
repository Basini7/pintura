import React, { useState } from 'react';
import { Proposal, ProviderProfile } from '../types.js';
import { generateWhatsAppMessage, openWhatsAppLink } from '../utils/whatsappShare.js';
import { generateProposalPDF } from '../utils/pdfGenerator.js';
import { 
  FileText, 
  Share2, 
  Download, 
  Copy, 
  Trash2, 
  Edit3, 
  Search, 
  Plus, 
  Calendar, 
  MapPin, 
  DollarSign,
  Eye,
  CheckCircle2
} from 'lucide-react';

interface ProposalListProps {
  proposals: Proposal[];
  profile: ProviderProfile;
  onEdit: (proposal: Proposal) => void;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNew: () => void;
  onViewPublic?: (id: string) => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({
  proposals,
  profile,
  onEdit,
  onDuplicate,
  onDelete,
  onNew,
  onViewPublic,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('pt-BR');
  };

  const filtered = proposals.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.client.name.toLowerCase().includes(term) ||
      (p.client.address || '').toLowerCase().includes(term) ||
      p.proposalNumber.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Histórico de Propostas</h2>
          <p className="text-xs text-slate-500">
            Gerencie seus orçamentos, reenvie por WhatsApp ou gere novas vias em PDF
          </p>
        </div>

        <button
          onClick={onNew}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Proposta</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, endereço ou número da proposta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs p-2.5 pl-10 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Nenhuma proposta encontrada.</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm ? 'Tente outro termo na busca.' : 'Crie sua primeira proposta comercial agora.'}
          </p>
          {!searchTerm && (
            <button
              onClick={onNew}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm inline-flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Proposta</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {item.proposalNumber}
                    </span>
                    {item.status === 'APPROVED' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aprovada
                      </span>
                    ) : item.viewCount && item.viewCount > 0 ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Visualizada ({item.viewCount})
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Rascunho
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.createdAt)}</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{item.client.name}</h3>
                  {item.client.address && (
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{item.client.address}</span>
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {item.terms.includesMaterials ? 'Mão de Obra + Material' : 'Mão de Obra'}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatBRL(item.pricing.netAmount)}
                  </span>
                </div>
              </div>

              {/* Áreas incluídas */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                {item.areas.map((a, i) => (
                  <span
                    key={i}
                    className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                  >
                    {a.areaName}
                  </span>
                ))}
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => onDuplicate(item.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Duplicar Proposta para outro cliente"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir a proposta de ${item.client.name}?`)) {
                        onDelete(item.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Excluir Proposta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      if (onViewPublic) {
                        onViewPublic(item.id);
                      } else {
                        window.location.hash = `proposta=${item.id}`;
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                    title="Visualizar Proposta Interativa"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Online</span>
                  </button>

                  <button
                    onClick={() => {
                      const msg = generateWhatsAppMessage(item, profile);
                      openWhatsAppLink(item.client.phone, msg);
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => generateProposalPDF(item, profile)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
