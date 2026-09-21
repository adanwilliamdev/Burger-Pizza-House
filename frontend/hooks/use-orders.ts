"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Order, OrderStatus, OrderType, PaymentMethod } from "@/lib/types";

interface OrderFilters {
  status?: OrderStatus | "";
  type?: OrderType | "";
  start_date?: string;
  end_date?: string;
}

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () =>
      apiFetch<Order[]>("/orders", {
        params: {
          status: filters.status || undefined,
          type: filters.type || undefined,
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        },
      }),
    refetchInterval: 20_000,
  });
}

export function useOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiFetch<Order>(`/orders/${id}`),
    enabled: id !== undefined,
    refetchInterval: 10_000,
  });
}

export interface OrderItemPayload {
  product_id: number;
  quantity: number;
  notes?: string | null;
  half_flavors: string[];
}

export interface CreateOrderPayload {
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  type: OrderType;
  payment_method: PaymentMethod;
  items: OrderItemPayload[];
  discount: number;
  delivery_fee: number;
  note?: string | null;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => apiFetch<Order>("/orders", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOrderStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: OrderStatus) =>
      apiFetch<Order>(`/orders/${id}/status`, { method: "POST", body: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
