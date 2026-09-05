import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, LoginCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // O token agora vive num cookie httpOnly, que o navegador já anexa
    // automaticamente em toda requisição (graças a `withCredentials: true`
    // em services/api.ts) — não há mais nada pra ler do localStorage aqui.
    // Só perguntamos ao backend "quem sou eu" e deixamos o próprio cookie
    // (se existir e for válido) responder.
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    const { user } = response.data;
    // O backend já setou o cookie httpOnly na resposta; só guardamos o
    // usuário no estado do React para a UI.
    setUser(user);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {
      // mesmo que a chamada falhe (ex: rede), limpamos o estado local —
      // na pior das hipóteses o cookie expira sozinho em 24h.
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
