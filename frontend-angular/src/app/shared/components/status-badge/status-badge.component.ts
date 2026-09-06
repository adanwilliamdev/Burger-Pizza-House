import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';
import { StatusTone } from '../../../core/models';

const toneClass: Record<StatusTone, string> = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="toneClass[tone]">
      @if (icon) {
        <svg [lucideIcon]="icon" class="w-3 h-3"></svg>
      }
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) tone!: StatusTone;
  @Input() icon?: LucideIconInput;

  readonly toneClass = toneClass;
}
