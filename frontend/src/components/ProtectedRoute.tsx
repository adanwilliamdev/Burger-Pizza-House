import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

/**
 * Guarda de rota no frontend.
 *
 * Até então, rotas como /products, /orders e /ingredients só eram
 * "protegidas" indiretamente: a API retornava 401 e o interceptor do
 * axios redirecionava para /login. Isso significa que, por um instante,
 * a UI do Layout (menu, dados em cache, etc.) chegava a ser renderizada
 * para quem não estava autenticado.
 *
 * O ProtectedRoute resolve isso no nível de rota: enquanto o AuthContext
 * ainda está carregando o usuário (ex: validando o token salvo), mostra
 * um loading; se não houver usuário autenticado, redireciona para
 * /login preservando a rota de origem em `state.from`, para permitir
 * voltar para onde o usuário tentou ir após o login.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-gray-900 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center animate-pulse" />
        <p className="text-caption">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
