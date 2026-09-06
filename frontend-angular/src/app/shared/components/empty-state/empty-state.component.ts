import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput, LucideInbox as Inbox } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center text-center py-14 px-4">
      <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
        <svg [lucideIcon]="icon" class="w-6 h-6 text-muted dark:text-gray-400"></svg>
      </div>
      <p class="text-body font-semibold">{{ title }}</p>
      @if (description) {
        <p class="text-caption mt-1 max-w-xs">{{ description }}</p>
      }
      <div class="mt-4">
        <ng-content select="[action]" />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon: LucideIconInput = Inbox;
  @Input() title = '';
  @Input() description?: string;
}
