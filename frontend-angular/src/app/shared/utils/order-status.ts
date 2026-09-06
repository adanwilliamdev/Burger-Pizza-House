import {
  LucideIconInput,
  LucideClock as Clock,
  LucideCheckCircle as CheckCircle,
  LucideXCircle as XCircle,
  LucideTruck as Truck,
  LucidePackage as Package,
} from '@lucide/angular';
import { StatusTone } from '../../core/models';

export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY: 'success',
  DELIVERING: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  DELIVERING: 'Entregando',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_ICON: Record<string, LucideIconInput> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY: CheckCircle,
  DELIVERING: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

export const ORDER_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PREPARING', label: 'Preparando' },
  { value: 'READY', label: 'Pronto' },
  { value: 'DELIVERING', label: 'Entregando' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado' },
];
