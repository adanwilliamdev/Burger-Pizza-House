"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Category, Product, ProductIngredientLine, ProductType } from "@/lib/types";

interface ProductFilters {
  category?: Category | "";
  is_active?: "true" | "false" | "";
  q?: string;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      apiFetch<Product[]>("/products", {
        params: {
          category: filters.category || undefined,
          is_active: filters.is_active === "" ? undefined : filters.is_active,
          q: filters.q || undefined,
        },
      }),
  });
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<Product>(`/products/${id}`),
    enabled: id !== undefined,
  });
}

export interface ProductPayload {
  name: string;
  description: string | null;
  price: number;
  cost: number;
  category: Category;
  type: ProductType;
  is_active: boolean;
  image: string | null;
  preparation_time: number;
  ingredients: ProductIngredientLine[];
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductPayload) => apiFetch<Product>("/products", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductPayload) => apiFetch<Product>(`/products/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ deactivated: boolean; message: string }>(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
