import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'bph-theme-mode';

function getSystemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function resolveIsDark(mode: ThemeMode): boolean {
  return mode === 'system' ? getSystemPrefersDark() : mode === 'dark';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private modeSignal = signal<ThemeMode>(
    (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || 'system'
  );
  private isDarkSignal = signal<boolean>(resolveIsDark(this.modeSignal()));

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = this.isDarkSignal.asReadonly();

  constructor() {
    // Sempre que o modo mudar, recalcula isDark, aplica a classe .dark no
    // <html> (é o que o Tailwind usa pra ativar o `dark:` — ver styles.css)
    // e persiste a escolha.
    effect(() => {
      const mode = this.modeSignal();
      const dark = resolveIsDark(mode);
      this.isDarkSignal.set(dark);
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem(STORAGE_KEY, mode);
    });

    // Se o modo for "system", acompanha mudanças do SO em tempo real.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (this.modeSignal() !== 'system') return;
      this.isDarkSignal.set(e.matches);
      document.documentElement.classList.toggle('dark', e.matches);
    });
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
  }

  toggle(): void {
    this.modeSignal.set(this.isDarkSignal() ? 'light' : 'dark');
  }
}
