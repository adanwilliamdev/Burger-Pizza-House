import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RevenueData } from '../../../core/models';

interface Point {
  x: number;
  y: number;
  data: RevenueData;
}

const WIDTH = 800;
const HEIGHT = 300;
const PADDING = { top: 16, right: 12, bottom: 28, left: 56 };

/**
 * Gráfico de área substituindo o `recharts` do frontend original.
 * Implementado em SVG puro para evitar mais uma dependência pesada — o
 * visual (gradiente laranja, grid horizontal, tooltip ao passar o mouse)
 * é o mesmo do Dashboard.tsx original.
 */
@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full" style="height: 300px" (mouseleave)="hoverIndex.set(null)">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F97316" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#F97316" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Grid horizontal -->
        @for (line of gridLines(); track line.y) {
          <line
            [attr.x1]="padding.left"
            [attr.x2]="width - padding.right"
            [attr.y1]="line.y"
            [attr.y2]="line.y"
            stroke="#E5E7EB"
            stroke-dasharray="3 3"
          />
          <text [attr.x]="padding.left - 8" [attr.y]="line.y + 4" text-anchor="end" font-size="12" fill="#6B7280">
            {{ line.label }}
          </text>
        }

        <!-- Área preenchida -->
        @if (areaPath()) {
          <path [attr.d]="areaPath()" fill="url(#revenueGradient)" />
          <path [attr.d]="linePath()" fill="none" stroke="#F97316" stroke-width="3" stroke-linecap="round" />
        }

        <!-- Eixo X -->
        @for (point of points(); track point.data.date; let i = $index) {
          @if (shouldShowLabel(i)) {
            <text [attr.x]="point.x" [attr.y]="height - 8" text-anchor="middle" font-size="12" fill="#6B7280">
              {{ formatDay(point.data.date) }}
            </text>
          }
          <rect
            [attr.x]="point.x - barWidth() / 2"
            [attr.y]="padding.top"
            [attr.width]="barWidth()"
            [attr.height]="height - padding.top - padding.bottom"
            fill="transparent"
            (mouseenter)="hoverIndex.set(i)"
          />
          @if (hoverIndex() === i) {
            <line
              [attr.x1]="point.x"
              [attr.x2]="point.x"
              [attr.y1]="padding.top"
              [attr.y2]="height - padding.bottom"
              stroke="#F97316"
              stroke-width="1"
              stroke-dasharray="4 4"
            />
            <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" fill="#F97316" stroke="white" stroke-width="2" />
          }
        }
      </svg>

      @if (hovered(); as h) {
        <div
          class="absolute pointer-events-none bg-white dark:bg-gray-800 border border-line dark:border-gray-700 rounded-2xl shadow-soft px-3 py-2 text-xs"
          [style.left.%]="(h.x / width) * 100"
          [style.top.px]="h.y - 60"
          style="transform: translateX(-50%)"
        >
          <p class="text-caption">{{ formatFullDate(h.data.date) }}</p>
          <p class="font-semibold text-ink dark:text-gray-100">R$ {{ h.data.revenue.toFixed(2) }}</p>
        </div>
      }
    </div>
  `,
})
export class RevenueChartComponent {
  @Input({ required: true }) set data(value: RevenueData[]) {
    this.dataSignal.set(value ?? []);
  }

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly padding = PADDING;

  private dataSignal = signal<RevenueData[]>([]);
  readonly hoverIndex = signal<number | null>(null);

  private maxRevenue = computed(() => {
    const values = this.dataSignal().map((d) => d.revenue);
    return Math.max(1, ...values);
  });

  readonly points = computed<Point[]>(() => {
    const data = this.dataSignal();
    const innerWidth = this.width - this.padding.left - this.padding.right;
    const innerHeight = this.height - this.padding.top - this.padding.bottom;
    const max = this.maxRevenue();

    return data.map((d, i) => {
      const x =
        data.length === 1
          ? this.padding.left + innerWidth / 2
          : this.padding.left + (i / (data.length - 1)) * innerWidth;
      const y = this.padding.top + innerHeight - (d.revenue / max) * innerHeight;
      return { x, y, data: d };
    });
  });

  readonly barWidth = computed(() => {
    const n = this.dataSignal().length;
    if (n <= 1) return this.width - this.padding.left - this.padding.right;
    return (this.width - this.padding.left - this.padding.right) / n;
  });

  readonly gridLines = computed(() => {
    const max = this.maxRevenue();
    const innerHeight = this.height - this.padding.top - this.padding.bottom;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const ratio = i / steps;
      return {
        y: this.padding.top + innerHeight * ratio,
        label: `R$${Math.round(max * (1 - ratio))}`,
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const bottom = this.height - this.padding.bottom;
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${line} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
  });

  readonly hovered = computed<Point | null>(() => {
    const idx = this.hoverIndex();
    if (idx === null) return null;
    return this.points()[idx] ?? null;
  });

  shouldShowLabel(index: number): boolean {
    const n = this.dataSignal().length;
    const maxLabels = 8;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    return index % step === 0;
  }

  formatDay(date: string): string {
    return format(new Date(date), 'dd/MM');
  }

  formatFullDate(date: string): string {
    return format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
  }
}
