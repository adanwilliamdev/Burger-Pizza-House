import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideDynamicIcon,
  LucideIconInput,
  LucideTrendingUp as TrendingUp,
  LucideTrendingDown as TrendingDown,
  LucidePackage as Package,
  LucideShoppingBag as ShoppingBag,
  LucideClock as Clock,
  LucideDollarSign as DollarSign,
  LucideReceipt as Receipt,
  LucideAlertTriangle as AlertTriangle,
} from '@lucide/angular';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrdersService } from '../../core/services/orders.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, Order, RevenueData, StatusTone } from '../../core/models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RevenueChartComponent } from '../../shared/components/revenue-chart/revenue-chart.component';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '../../shared/utils/order-status';

const RANGE_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '1 ano', days: 365 },
];

interface StatCard {
  title: string;
  value: string;
  icon: LucideIconInput;
  tone: 'success' | 'info' | 'warning' | 'danger';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    LucideDynamicIcon,
    EmptyStateComponent,
    SkeletonCardComponent,
    StatusBadgeComponent,
    RevenueChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private dashboardService = inject(DashboardService);
  private ordersService = inject(OrdersService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  readonly rangeOptions = RANGE_OPTIONS;
  readonly statusLabel = ORDER_STATUS_LABEL;
  readonly statusTone = ORDER_STATUS_TONE;

  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly Package = Package;
  readonly ShoppingBag = ShoppingBag;
  readonly Clock = Clock;

  readonly stats = signal<DashboardStats | null>(null);
  readonly revenueData = signal<RevenueData[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly chartLoading = signal(false);
  readonly range = signal(7);

  readonly greeting = getGreeting();

  readonly revenueTrend = computed<number | null>(() => {
    const data = this.revenueData();
    if (data.length < 2) return null;
    const last = data[data.length - 1].revenue;
    const prev = data[data.length - 2].revenue;
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  });

  readonly recentOrders = computed<Order[]>(() =>
    [...this.orders()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  readonly ticketMedio = computed(() => {
    const s = this.stats();
    return s && s.totalOrders > 0 ? s.totalRevenue / s.totalOrders : 0;
  });

  readonly maxSold = computed(() =>
    Math.max(1, ...(this.stats()?.topProducts || []).map((p) => p.totalSold || 0))
  );

  readonly statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    return [
      { title: 'Receita hoje', value: `R$ ${(s?.todayRevenue || 0).toFixed(2)}`, icon: DollarSign, tone: 'success' },
      { title: 'Receita total', value: `R$ ${(s?.totalRevenue || 0).toFixed(2)}`, icon: TrendingUp, tone: 'info' },
      { title: 'Pedidos hoje', value: String(s?.todayOrders || 0), icon: ShoppingBag, tone: 'info' },
      { title: 'Pedidos pendentes', value: String(s?.pendingOrders || 0), icon: Clock, tone: 'warning' },
      { title: 'Ticket médio', value: `R$ ${this.ticketMedio().toFixed(2)}`, icon: Receipt, tone: 'info' },
      { title: 'Estoque crítico', value: String(s?.lowStock || 0), icon: AlertTriangle, tone: 'danger' },
    ];
  });

  readonly toneClasses: Record<StatCard['tone'], string> = {
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  constructor() {
    this.fetchInitial();
    this.fetchRevenue(this.range());
  }

  private async fetchInitial(): Promise<void> {
    try {
      const [stats, orders] = await Promise.all([
        this.dashboardService.getStats(),
        this.ordersService.getAll(),
      ]);
      this.stats.set(stats);
      this.orders.set(orders);
    } catch {
      this.toast.error('Erro ao carregar dados do dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchRevenue(days: number): Promise<void> {
    this.chartLoading.set(true);
    try {
      const data = await this.dashboardService.getRevenue(days);
      this.revenueData.set(data);
    } catch {
      this.toast.error('Erro ao carregar faturamento');
    } finally {
      this.chartLoading.set(false);
    }
  }

  selectRange(days: number): void {
    this.range.set(days);
    this.fetchRevenue(days);
  }

  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
  }

  firstName(): string {
    return this.auth.user()?.name?.split(' ')[0] || 'Administrador';
  }

  statusToneOf(status: string): StatusTone {
    return this.statusTone[status] || 'neutral';
  }
}
