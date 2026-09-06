import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-line',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="skeleton h-4" [class]="className"></div>`,
})
export class SkeletonLineComponent {
  @Input() className = '';
}

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-card">
      <div class="space-y-2 flex-1">
        <div class="skeleton h-4 w-24"></div>
        <div class="skeleton h-8 w-20"></div>
      </div>
      <div class="skeleton w-10 h-10 rounded-xl"></div>
    </div>
  `,
})
export class SkeletonCardComponent {}

@Component({
  selector: 'app-skeleton-table-rows',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of rowsArray; track row) {
      <tr class="table-row">
        @for (col of colsArray; track col) {
          <td class="py-3 px-4">
            <div class="skeleton h-4" [class]="col === 0 ? 'w-32' : 'w-16'"></div>
          </td>
        }
      </tr>
    }
  `,
})
export class SkeletonTableRowsComponent {
  @Input() rows = 5;
  @Input() cols = 4;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get colsArray(): number[] {
    return Array.from({ length: this.cols }, (_, i) => i);
  }
}
