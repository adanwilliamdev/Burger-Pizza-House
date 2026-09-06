import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginCredentials, User } from '../models';

/**
 * Autenticação via cookie httpOnly.
 *
 * O token JWT vive num cookie httpOnly setado pelo backend (ver
 * backend/src/controllers/auth.controller.ts) e é enviado automaticamente
 * pelo navegador em toda requisição — por isso o HttpClient é configurado
 * globalmente com `withCredentials: true` (ver app.config.ts). Este
 * serviço só mantém o usuário atual em memória (signals) para a UI.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth`;

  private userSignal = signal<User | null>(null);
  private loadingSignal = signal(true);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  /** Pergunta ao backend "quem sou eu" — chamado uma vez, na inicialização do app. */
  async fetchUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<User>(`${this.baseUrl}/me`));
      this.userSignal.set(user);
    } catch {
      this.userSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ user: User }>(`${this.baseUrl}/login`, credentials)
    );
    this.userSignal.set(response.user);
  }

  logout(): void {
    // Mesmo que a chamada falhe (ex: rede), limpamos o estado local —
    // na pior das hipóteses o cookie expira sozinho.
    firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {})).catch(() => undefined);
    this.userSignal.set(null);
  }
}
