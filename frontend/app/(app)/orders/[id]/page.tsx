"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { ApiClientError } from "@/lib/api";
import {
  orderStatusColors,
  orderStatusLabels,
  orderTypeLabels,
  paymentMethodLabels,
} from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { OrderStatus } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus(id);
  const { toast } = useToast();
  const [updating, setUpdating] = useState<OrderStatus | null>(null);

  async function handleStatusChange(status: OrderStatus) {
    setUpdating(status);
    try {
      await updateStatus.mutateAsync(status);
      toast(`Status atualizado para "${orderStatusLabels[status]}".`, "success");
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Não foi possível atualizar o status.", "error");
    } finally {
      setUpdating(null);
    }
  }

  if (isLoading || !order) {
    return (
      <PageContainer title="Pedido">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Pedido #${order.number}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Itens do pedido</CardTitle>
              </div>
              <Badge className={orderStatusColors[order.status]} variant="outline">
                {orderStatusLabels[order.status]}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Preço unit.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.product_name}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        {item.half_flavors.length > 0 && (
                          <p className="text-xs text-muted-foreground">Meio a meio: {item.half_flavors.join(" / ")}</p>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMoney(item.unit_price)}</TableCell>
                      <TableCell>{formatMoney(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Nome: </span>
                {order.customer_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Telefone: </span>
                {order.customer_phone ?? "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Endereço: </span>
                {order.customer_address ?? "—"}
              </p>
              {order.note && (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Observações: </span>
                  {order.note}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Tipo</span>
                <span className="text-foreground">{orderTypeLabels[order.type]}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Pagamento</span>
                <span className="text-foreground">{paymentMethodLabels[order.payment_method]}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Atendente</span>
                <span className="text-foreground">{order.user.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Criado em</span>
                <span className="text-foreground">{formatDateTime(order.created_at)}</span>
              </div>

              <Separator className="my-2" />

              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Desconto</span>
                  <span>-{formatMoney(order.discount)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>{formatMoney(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {order.allowed_next_statuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Atualizar status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {order.allowed_next_statuses.map((status) => (
                  <Button
                    key={status}
                    variant={status === "CANCELLED" ? "destructive" : "default"}
                    onClick={() => handleStatusChange(status)}
                    disabled={updating !== null}
                  >
                    {updating === status && <Loader2 className="h-4 w-4 animate-spin" />}
                    Marcar como {orderStatusLabels[status].toLowerCase()}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
