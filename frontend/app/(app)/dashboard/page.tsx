"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Clock, DollarSign, ShoppingBag } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboard } from "@/hooks/use-dashboard";
import { orderStatusColors, orderStatusLabels } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={
            tone === "warning"
              ? "flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground"
              : "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useDashboard(days);

  return (
    <PageContainer
      title="Dashboard"
      actions={
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={DollarSign} label="Faturamento hoje" value={formatMoney(data.today_revenue)} />
            <StatCard icon={ShoppingBag} label="Pedidos hoje" value={String(data.today_orders)} />
            <StatCard icon={Clock} label="Pedidos em andamento" value={String(data.pending_orders)} />
            <StatCard
              icon={AlertTriangle}
              label="Ingredientes em estoque baixo"
              value={String(data.low_stock)}
              tone={data.low_stock > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Faturamento por dia</CardTitle>
              </CardHeader>
              <CardContent className="h-72 pl-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenue_by_day} margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDate(v)}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value)}
                      labelFormatter={(v) => formatDate(v)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mais vendidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.top_products.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ainda não há vendas registradas.</p>
                )}
                {data.top_products.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <span className="text-muted-foreground">{p.total_sold} un.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          #{order.number}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customer_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={orderStatusColors[order.status]} variant="outline">
                          {orderStatusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMoney(order.total)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
