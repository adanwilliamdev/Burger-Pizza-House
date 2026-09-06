import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucidePizza as Pizza, LucideHome as Home } from '@lucide/angular';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-gray-900 text-center px-6">
      <div class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
        <svg [lucideIcon]="Pizza" class="w-10 h-10 text-primary"></svg>
      </div>
      <h1 class="text-[64px] font-bold leading-none text-ink dark:text-gray-100">404</h1>
      <p class="text-card-title mt-2">Essa página saiu para entrega e não voltou.</p>
      <p class="text-caption mt-1 max-w-sm">A página que você tentou acessar não existe ou foi movida.</p>
      <a routerLink="/dashboard" class="btn-primary mt-6 inline-flex items-center gap-2">
        <svg [lucideIcon]="Home" class="w-4 h-4"></svg>
        Voltar ao início
      </a>
    </div>
  `,
})
export class NotFoundComponent {
  readonly Pizza = Pizza;
  readonly Home = Home;
}
