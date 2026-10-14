"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, clearTokens, getTokens, setTokens } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { access } = getTokens();
      // Todos os caminhos passam por um `await` antes do setState: a regra
      // react-hooks/set-state-in-effect proíbe setState síncrono no corpo do effect.
      let me: User | null = null;
      if (access) {
        me = await apiFetch<User>("/auth/me").catch(() => {
          clearTokens();
          return null;
        });
      } else {
        await Promise.resolve();
      }
      if (cancelled) return;
      setUser(me);
      setLoading(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ access_token: string; refresh_token: string; user: User }>(
        "/auth/login",
        { method: "POST", body: { email, password }, skipAuth: true }
      );
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    const { refresh } = getTokens();
    try {
      if (refresh) {
        await apiFetch("/auth/logout", { method: "POST", body: { refresh_token: refresh } });
      }
    } catch {
      // mesmo se a revogação falhar, seguimos limpando a sessão local
    }
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
