import React, { useState } from 'react';
import { WorkAreaConfig, SelectedAreaScope, SubstrateCategory } from '../types.js';
import { Check, Plus, X, Layers, Sparkles } from 'lucide-react';

interface AreaSelectorModalProps {
  catalog: WorkAreaConfig[];
  onAddArea: (areaId: string, options: any) => Promise<void>;
  onClose: () => void;
  selectedAreaIds: string[];
}

export const AreaSelectorModal: React.FC<AreaSelectorModalProps> = ({
  catalog,
  onAddArea,
  onClose,
  selectedAreaIds,
}) => {
  const [selectedConfig, setSelectedConfig] = useState<WorkAreaConfig | null>(null);
  const [cleaningMethod, setCleaningMethod] = useState<'Limpeza simples' | 'Hidrojateamento'>('Hidrojateamento');
  const [finishType, setFinishType] = useState<string>('Textura Granfino Hidro-repelente');
  const [customFinishText, setCustomFinishText] = useState<string>('');
  const [woodFinishType, setWoodFinishType] = useState<'Verniz' | 'Esmalte Sintético'>('Verniz');
  const [includeBurnedCement, setIncludeBurnedCement] = useState<boolean>(false);
  const [areaPrice, setAreaPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const categories: { key: SubstrateCategory; label: string }[] = [
    { key: 'ALVENARIA_EXTERNA', label: 'Alvenaria Externa' },
    { key: 'ALVENARIA_INTERNA', label: 'Alvenaria Interna' },
    { key: 'MADEIRAMENTOS', label: 'Madeiramentos' },
    { key: 'METALICOS', label: 'Metálicos' },
  ];

  const handleSelectAreaCard = (area: WorkAreaConfig) => {
    setSelectedConfig(area);
    if (area.category === 'ALVENARIA_EXTERNA') {
      setFinishType(area.id === 'muros' ? 'Textura Cristal' : 'Textura Granfino Hidro-repelente');
      setCleaningMethod('Hidrojateamento');
    } else if (area.category === 'MADEIRAMENTOS') {
      setWoodFinishType(area.id === 'portas' ? 'Esmalte Sintético' : 'Verniz');
    }
    setAreaPrice('');
  };

  const handleConfirm = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      await onAddArea(selectedConfig.id, {
        cleaningMethod,
        finishType,
        customFinishText,
        woodFinishType,
        includeBurnedCement,
        price: areaPrice ? parseFloat(areaPrice.replace(/\D/g, '')) / 100 : undefined,
      });
      setSelectedConfig(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 md:p-6 my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Adicionar Área de Trabalho</h2>
              <p className="text-xs text-slate-500">
                Selecione a área para injetar automaticamente o processo técnico padrão
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedConfig ? (
          <div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const areas = catalog.filter((a) => a.category === cat.key);
              if (areas.length === 0) return null;

              return (
                <div key={cat.key}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {cat.label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {areas.map((area) => {
                      const isAdded = selectedAreaIds.includes(area.id);
                      return (
                        <button
                          key={area.id}
                          onClick={() => handleSelectAreaCard(area)}
                          className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition-all ${
                            isAdded
                              ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
                              : 'border-slate-200 hover:border-blue-400 hover:shadow-sm bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-sm text-slate-800">{area.name}</span>
                              {isAdded && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                                  Já inclusa
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {area.defaultSteps.length} etapas técnicas automáticas
                            </p>
                          </div>
                          <div className="p-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white shrink-0 mt-0.5">
                            <Plus className="w-4 h-4" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {selectedConfig.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800">{selectedConfig.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedConfig(null)}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Trocar área
                </button>
              </div>
            </div>

            {/* Opções específicas para Alvenaria Externa */}
            {selectedConfig.category === 'ALVENARIA_EXTERNA' && (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Opções de Execução Externa:</h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método de Limpeza:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Hidrojateamento', 'Limpeza simples'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setCleaningMethod(method)}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                          cleaningMethod === method
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Acabamento:</label>
                  <select
                    value={finishType}
                    onChange={(e) => setFinishType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Textura Granfino Hidro-repelente">Textura Granfino Hidro-repelente</option>
                    <option value="Textura Cristal">Textura Cristal</option>
                    <option value="Pintura Acrílica">Pintura Acrílica Premium</option>
                    <option value="Outra">Outra (especificar)</option>
                  </select>

                  {finishType === 'Outra' && (
                    <input
                      type="text"
                      placeholder="Ex: Micro revestimento Artcollor, Textura projetada..."
                      value={customFinishText}
                      onChange={(e) => setCustomFinishText(e.target.value)}
                      className="mt-2 w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {selectedConfig.id === 'fachada_externa' && (
                  <label className="flex items-center space-x-2 text-xs text-slate-700 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBurnedCement}
                      onChange={(e) => setIncludeBurnedCement(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>Incluir revitalização de cimento queimado com hidrofugante</span>
                  </label>
                )}
              </div>
            )}

            {/* Opções específicas para Madeiramentos */}
            {selectedConfig.category === 'MADEIRAMENTOS' && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">Acabamento da Madeira:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Verniz', 'Esmalte Sintético'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWoodFinishType(opt)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                        woodFinishType === opt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Valor opcional por área */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Valor desta Área (Opcional caso queira orçar por cômodo/área):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={areaPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    if (!raw) {
                      setAreaPrice('');
                      return;
                    }
                    const num = parseInt(raw, 10) / 100;
                    setAreaPrice(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                  }}
                  className="w-full text-xs p-2.5 pl-9 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedConfig(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Carregando...' : 'Confirmar e Injetar Escopo'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
