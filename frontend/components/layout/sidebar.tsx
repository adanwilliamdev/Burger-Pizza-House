"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Flame,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wheat,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/orders", label: "Pedidos", icon: ClipboardList, adminOnly: false },
  { href: "/products", label: "Produtos", icon: Package, adminOnly: false },
  { href: "/ingredients", label: "Ingredientes", icon: Wheat, adminOnly: false },
  { href: "/users", label: "Usuários", icon: Users, adminOnly: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 px-5 font-display text-base font-semibold">
        <Flame className="h-5 w-5 text-sidebar-accent" />
        Burger &amp; Pizza House
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent/15 text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-sidebar-accent")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/orders/new"
          className="flex items-center justify-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <ShoppingBag className="h-4 w-4" />
          Novo pedido
        </Link>
      </div>
    </aside>
  );
}
