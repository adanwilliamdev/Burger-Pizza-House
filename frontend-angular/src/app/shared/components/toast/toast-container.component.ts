import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideDynamicIcon,
  LucideCheckCircle2 as CheckCircle2,
  LucideXCircle as XCircle,
  LucideInfo as Info,
  LucideX as X,
} from '@lucide/angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-center gap-2.5 bg-gray-900 text-white text-sm font-medium rounded-2xl px-4 py-3 shadow-soft-lg min-w-[220px] max-w-sm animate-toast-in"
        >
          @switch (toast.type) {
            @case ('success') {
              <svg [lucideIcon]="CheckCircle2" class="w-4 h-4 text-success shrink-0"></svg>
            }
            @case ('error') {
              <svg [lucideIcon]="XCircle" class="w-4 h-4 text-danger shrink-0"></svg>
            }
            @default {
              <svg [lucideIcon]="Info" class="w-4 h-4 text-info shrink-0"></svg>
            }
          }
          <span class="flex-1">{{ toast.message }}</span>
          <button
            type="button"
            class="text-gray-400 hover:text-white transition-colors"
            (click)="toastService.dismiss(toast.id)"
          >
            <svg [lucideIcon]="X" class="w-3.5 h-3.5"></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-toast-in {
        animation: toast-in 0.2s ease-out;
      }
    `,
  ],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircle = XCircle;
  readonly Info = Info;
  readonly X = X;
}
