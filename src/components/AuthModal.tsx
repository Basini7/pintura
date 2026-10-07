import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Loader2, ShieldCheck, ArrowRight, Paintbrush } from 'lucide-react';
import { api } from '../services/api.js';
import { AuthResponse } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authData: AuthResponse) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result: AuthResponse;
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('Informe seu nome ou nome da empresa.');
        }
        result = await api.register(name, email, password);
      } else {
        result = await api.login(email, password);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar autenticação';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0a0a]/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center min-h-screen">
      <div className="bg-[#fffaf0] w-full max-w-md rounded-3xl shadow-2xl border border-[#e5e5e5] overflow-hidden relative max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95">
        {/* Header com botão fechar */}
        <div className="bg-[#0a0a0a] text-white p-5 sm:p-6 pb-4 sm:pb-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-[#ffb084] mb-1.5">
            <div className="bg-white/10 p-1.5 rounded-xl border border-white/15">
              <Paintbrush className="w-4 h-4 text-[#ffb084]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider">Proposta do Pintor</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta grátis'}
          </h2>
          <p className="text-xs text-white/70 mt-1">
            {mode === 'login'
              ? 'Gerencie seus orçamentos e feche contratos com agilidade.'
              : '1 proposta 100% gratuita na nuvem sem cartão de crédito.'}
          </p>

          {/* Abas Alternadoras Clay Style */}
          <div className="flex mt-3.5 bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'login' ? 'bg-[#fffaf0] text-[#0a0a0a] shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'register' ? 'bg-[#fffaf0] text-[#0a0a0a] shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>

        {/* Formulário com rolagem interna suave se tela for compacta */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-shake">
              ⚠️ {error}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[#0a0a0a] mb-1">
                Nome do Pintor / Empresa
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#6a6a6a] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva ou CS Pinturas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e5e5] bg-white rounded-xl focus:ring-2 focus:ring-[#0a0a0a] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1">E-mail Profissional</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6a6a6a] absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e5e5] bg-white rounded-xl focus:ring-2 focus:ring-[#0a0a0a] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0a0a0a] mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6a6a6a] absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#e5e5e5] bg-white rounded-xl focus:ring-2 focus:ring-[#0a0a0a] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#0a0a0a] hover:bg-[#1f1f1f] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar no Sistema' : 'Começar Gratuitamente'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 border-t border-[#e5e5e5] flex items-center justify-between text-[11px] text-[#6a6a6a]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
              Dados seguros & criptografados
            </span>
            <span className="font-semibold text-[#0a0a0a]">Degustação imediata</span>
          </div>
        </form>
      </div>
    </div>
  );
};
