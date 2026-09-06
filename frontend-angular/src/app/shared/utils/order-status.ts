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

/**
 * Espelha ORDER_STATUS_TRANSITIONS do backend (order.controller.ts).
 * Um pedido só avança no fluxo ou é cancelado — nunca "volta" nem pula
 * etapas, e nada muda a partir de um estado terminal (DELIVERED/CANCELLED).
 * Mantido em sincronia manualmente com o backend, que é quem de fato
 * garante a regra — isso aqui só evita oferecer, na tela, uma opção que a
 * API já sabemos que vai rejeitar com 409.
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['DELIVERING', 'DELIVERED', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};
