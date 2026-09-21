"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrders } from "@/hooks/use-orders";
import { orderStatusColors, orderStatusLabels, orderTypeLabels } from "@/lib/labels";
import type { OrderStatus, OrderType } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function OrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [type, setType] = useState<OrderType | "">("");

  const { data: orders, isLoading } = useOrders({ status, type });

  return (
    <PageContainer
      title="Pedidos"
      actions={
        <Button onClick={() => router.push("/orders/new")}>
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      }
    >
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : (v as OrderStatus))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(orderStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : (v as OrderType))}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(orderTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Carregando pedidos…</p>
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        #{order.number}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer_name ?? "—"}</TableCell>
                    <TableCell>{orderTypeLabels[order.type]}</TableCell>
                    <TableCell>
                      <Badge className={orderStatusColors[order.status]} variant="outline">
                        {orderStatusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMoney(order.total)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">Nenhum pedido encontrado para os filtros selecionados.</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
