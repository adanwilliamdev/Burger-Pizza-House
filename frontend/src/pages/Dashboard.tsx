import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { DashboardStats, RevenueData, Order } from '../types';
import { useAuth } from '../hooks/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingBag,
  Clock,
  DollarSign,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SkeletonCard } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

const RANGE_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '1 ano', days: 365 },
];

const statusTone: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY: 'success',
  DELIVERING: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  DELIVERING: 'Entregando',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [range, setRange] = useState(7);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchRevenue(range);
  }, [range]);

  const fetchInitial = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/orders'),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async (days: number) => {
    setChartLoading(true);
    try {
      const response = await api.get(`/dashboard/revenue?days=${days}`);
      setRevenueData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar faturamento');
    } finally {
      setChartLoading(false);
    }
  };

  const revenueTrend = useMemo(() => {
    if (revenueData.length < 2) return null;
    const last = revenueData[revenueData.length - 1].revenue;
    const prev = revenueData[revenueData.length - 2].revenue;
    if (prev === 0) return null;
    const pct = ((last - prev) / prev) * 100;
    return pct;
  }, [revenueData]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders]
  );

  const ticketMedio =
    stats && stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  const maxSold = useMemo(
    () => Math.max(1, ...(stats?.topProducts || []).map((p) => p.totalSold || 0)),
    [stats]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="skeleton h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Receita hoje',
      value: `R$ ${(stats?.todayRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      tone: 'success' as const,
    },
    {
      title: 'Receita total',
      value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      tone: 'info' as const,
    },
    {
      title: 'Pedidos hoje',
      value: String(stats?.todayOrders || 0),
      icon: ShoppingBag,
      tone: 'info' as const,
    },
    {
      title: 'Pedidos pendentes',
      value: String(stats?.pendingOrders || 0),
      icon: Clock,
      tone: 'warning' as const,
    },
    {
      title: 'Ticket médio',
      value: `R$ ${ticketMedio.toFixed(2)}`,
      icon: Receipt,
      tone: 'info' as const,
    },
    {
      title: 'Estoque crítico',
      value: String(stats?.lowStock || 0),
      icon: AlertTriangle,
      tone: 'danger' as const,
    },
  ];

  const toneClasses: Record<string, string> = {
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-page-title">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Administrador'} 👋
        </h1>
        <p className="text-caption mt-1">
          Hoje foram realizados <span className="font-semibold text-ink dark:text-gray-200">{stats?.todayOrders || 0}</span> pedidos.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {statCards.map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className="stat-card">
            <div>
              <p className="text-caption">{title}</p>
              <p className="text-value mt-1">{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-card-title">Faturamento</h3>
              {revenueTrend !== null && (
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${revenueTrend >= 0 ? 'text-success' : 'text-danger'}`}>
                  {revenueTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}% em relação ao dia anterior
                </p>
              )}
            </div>
            <div className="flex gap-1 bg-surface dark:bg-gray-900 rounded-xl p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setRange(opt.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                    ${range === opt.days ? 'bg-primary text-white' : 'text-muted hover:text-ink dark:hover:text-gray-100'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {chartLoading ? (
            <div className="skeleton h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), 'dd/MM')}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                  labelFormatter={(d) => format(new Date(d), "dd 'de' MMMM", { locale: ptBR })}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F97316"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="text-card-title mb-4">Produtos mais vendidos</h3>
          {!stats?.topProducts || stats.topProducts.length === 0 ? (
            <EmptyState title="Nenhum produto vendido ainda" icon={Package} />
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={product.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-caption shrink-0">#{index + 1}</span>
                      <span className="text-sm font-medium truncate">{product.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0 ml-2">
                      {product.totalSold} un.
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${((product.totalSold || 0) / maxSold) * 100}%` }}
                    />
                  </div>
                  <p className="text-caption mt-1">R$ {(product.price * (product.totalSold || 0)).toFixed(2)} vendidos</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="table-shell lg:col-span-2">
          <div className="p-5 pb-0">
            <h3 className="text-card-title">Pedidos recentes</h3>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="Nenhum pedido ainda" icon={ShoppingBag} />
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header-cell">Pedido</th>
                    <th className="table-header-cell">Cliente</th>
                    <th className="table-header-cell">Total</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="py-3 px-4 text-sm font-semibold text-primary">#{order.number}</td>
                      <td className="py-3 px-4 text-sm">{order.customerName || 'Não identificado'}</td>
                      <td className="py-3 px-4 text-sm font-semibold">R$ {order.total.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <StatusBadge label={statusLabel[order.status] || order.status} tone={statusTone[order.status] || 'neutral'} />
                      </td>
                      <td className="py-3 px-4 text-caption">
                        {formatDistanceToNow(new Date(order.createdAt), { locale: ptBR, addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-card-title mb-4">Atividade recente</h3>
          {recentOrders.length === 0 ? (
            <EmptyState title="Sem atividade ainda" icon={Clock} />
          ) : (
            <ul className="space-y-4">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">
                      Pedido <span className="font-semibold">#{order.number}</span> criado
                      {order.customerName ? ` para ${order.customerName}` : ''}
                    </p>
                    <p className="text-caption">
                      {formatDistanceToNow(new Date(order.createdAt), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
