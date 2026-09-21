"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

export function useDashboard(days: number) {
  return useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard", { params: { days } }),
    refetchInterval: 30_000,
  });
}
