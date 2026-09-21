"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
  });
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => apiFetch<User>("/users", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
