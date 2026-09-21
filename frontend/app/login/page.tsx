"use client";

import { useState, type FormEvent } from "react";
import { Flame, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <Flame className="h-5 w-5 text-sidebar-accent" />
          Burger &amp; Pizza House
        </div>
        <div className="space-y-4">
          <p className="font-display text-4xl font-semibold leading-tight">
            O forno não espera.
            <br />
            O seu painel também não deveria.
          </p>
          <p className="max-w-md text-sm text-sidebar-muted">
            Pedidos, estoque de ingredientes e faturamento do dia, tudo num só lugar — do balcão à cozinha.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted">Burger &amp; Pizza House — Sistema de Gestão</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 lg:hidden">
            <div className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
              <Flame className="h-5 w-5" />
              Burger &amp; Pizza House
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-semibold">Entrar</h1>
            <p className="text-sm text-muted-foreground">Acesse com seu e-mail e senha cadastrados.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                required
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Acesso inicial de demonstração: admin@burgerpizzahouse.com / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
