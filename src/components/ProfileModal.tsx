import React, { useState } from 'react';
import { ProviderProfile } from '../types.js';
import { maskPhone } from '../utils/masks.js';
import { User, Phone, MapPin, Key, Save, Check } from 'lucide-react';

interface ProfileModalProps {
  profile: ProviderProfile;
  onSave: (updated: ProviderProfile) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onSave }) => {
  const [companyName, setCompanyName] = useState(profile.companyName || '');
  const [contactName, setContactName] = useState(profile.contactName || '');
  const [phone1, setPhone1] = useState(profile.phones[0] || '');
  const [phone2, setPhone2] = useState(profile.phones[1] || '');
  const [address, setAddress] = useState(profile.address || '');
  const [pixKey, setPixKey] = useState(profile.pixKey || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const phones = [phone1.trim(), phone2.trim()].filter(Boolean);
      await onSave({
        companyName,
        contactName,
        phones,
        address,
        pixKey,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Dados do Prestador / Empresa</h2>
            <p className="text-xs text-slate-500">
              Esses dados serão inseridos automaticamente no cabeçalho e rodapé do PDF e no WhatsApp
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Fantasia / Razão Social da Empresa
            </label>
            <input
              type="text"
              placeholder="Ex: SILVA PINTURAS RESIDENCIAIS"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Responsável / Pintor
            </label>
            <input
              type="text"
              placeholder="Ex: Carlos Silva"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Telefone Principal (WhatsApp)</span>
              </label>
              <input
                type="text"
                placeholder="(11) 90000-0000"
                maxLength={15}
                value={phone1}
                onChange={(e) => setPhone1(maskPhone(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Telefone Secundário (Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="(11) 3000-0000"
                maxLength={15}
                value={phone2}
                onChange={(e) => setPhone2(maskPhone(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Endereço Completo (para o rodapé do PDF)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Av. Central, 500 – Bairro Centro – São Paulo – SP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Chave PIX (para fechamento no WhatsApp)</span>
            </label>
            <input
              type="text"
              placeholder="CPF, CNPJ, Telefone ou E-mail"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Dados Salvos com Sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
