"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Ingredient } from "@/lib/types";

export function useIngredients(lowStockOnly = false) {
  return useQuery({
    queryKey: ["ingredients", lowStockOnly],
    queryFn: () => apiFetch<Ingredient[]>("/ingredients", { params: { low_stock: lowStockOnly || undefined } }),
  });
}

export function useIngredient(id: number | undefined) {
  return useQuery({
    queryKey: ["ingredients", id],
    queryFn: () => apiFetch<Ingredient>(`/ingredients/${id}`),
    enabled: id !== undefined,
  });
}

export interface IngredientPayload {
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
}

export function useCreateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngredientPayload) =>
      apiFetch<Ingredient>("/ingredients", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useUpdateIngredient(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IngredientPayload) =>
      apiFetch<Ingredient>(`/ingredients/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      qc.invalidateQueries({ queryKey: ["ingredients", id] });
    },
  });
}

export function useAdjustStock(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { operation: "add" | "remove"; quantity: number }) =>
      apiFetch<Ingredient>(`/ingredients/${id}/stock`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/ingredients/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}
