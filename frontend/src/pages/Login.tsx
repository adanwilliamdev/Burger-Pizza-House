import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import { Pizza, Eye, EyeOff, TrendingUp, Package, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

const REMEMBER_KEY = 'bph-remember-email';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login({ email, password });
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      toast.success('Bem-vindo! 🍕');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface dark:bg-gray-900">
      {/* Painel ilustrativo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-sidebar via-gray-800 to-primary/40 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%)]" />
        <div className="relative z-10 text-white max-w-md px-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-soft-lg">
            <Pizza className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3 leading-tight">
            Gerencie sua operação em um só lugar
          </h2>
          <p className="text-gray-300 text-sm mb-10">
            Produtos, pedidos e estoque, tudo integrado para o seu negócio rodar sem atrito.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-200">Acompanhe pedidos em tempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-200">Controle total do seu estoque</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-200">Métricas claras para decidir melhor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex p-3 bg-primary rounded-2xl mb-4 lg:hidden">
              <Pizza className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-page-title">
              Burger & Pizza House <span className="text-primary">ERP</span>
            </h1>
            <p className="text-caption mt-2">Entre com sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@burgerpizzahouse.com"
                required
              />
            </div>

            <div>
              <label className="input-label">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-gray-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-line text-primary focus:ring-primary/40"
              />
              Lembrar meu e-mail
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-xs text-muted text-center mt-4">
              Credenciais: admin@burgerpizzahouse.com / admin123
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
