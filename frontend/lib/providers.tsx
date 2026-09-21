"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "./auth";
import { QueryProvider } from "./query-provider";
import { ToastProvider } from "./toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
