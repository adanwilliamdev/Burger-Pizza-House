"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrder } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { ApiClientError } from "@/lib/api";
import { categoryLabels, orderTypeLabels, paymentMethodLabels } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { CartLine, Category, OrderType, PaymentMethod, Product } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

export default function NewOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: products, isLoading } = useProducts({ is_active: "true" });
  const createOrder = useCreateOrder();

  const [category, setCategory] = useState<Category | "">("");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [type, setType] = useState<OrderType>("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(
    () => (products ?? []).filter((p) => !category || p.category === category),
    [products, category]
  );

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...prev, { product, quantity: 1, notes: "", half_flavors: [] }];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.product.id === productId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function updateNotes(productId: number, notes: string) {
    setCart((prev) => prev.map((line) => (line.product.id === productId ? { ...line, notes } : line)));
  }

  function removeLine(productId: number) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(deliveryFee) || 0));

  async function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Adicione ao menos um item ao pedido.");
      return;
    }
    if (Number(discount) > subtotal) {
      setError("O desconto não pode ser maior que o subtotal do pedido.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder.mutateAsync({
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        type,
        payment_method: paymentMethod,
        discount: Number(discount) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        note: note.trim() || null,
        items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          notes: line.notes || null,
          half_flavors: line.half_flavors,
        })),
      });
      toast(`Pedido #${order.number} criado com sucesso.`, "success");
      router.push(`/orders/${order.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409 && typeof err.detail === "object" && err.detail && "shortages" in err.detail) {
        setError("Estoque insuficiente para um ou mais ingredientes deste pedido.");
      } else {
        setError(err instanceof ApiClientError ? err.message : "Não foi possível criar o pedido.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer title="Novo pedido">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={category === "" ? "default" : "outline"} size="sm" onClick={() => setCategory("")}>
              Todos
            </Button>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <Button
                key={value}
                variant={category === value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(value as Category)}
              >
                {label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <span className="text-xs text-muted-foreground">{categoryLabels[product.category]}</span>
                  <span className="font-medium">{product.name}</span>
                  <span className="font-display text-sm font-semibold text-primary">{formatMoney(product.price)}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
              )}
            </div>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>Carrinho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Clique nos produtos ao lado para adicioná-los.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div key={line.product.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{line.product.name}</p>
                      <button
                        type="button"
                        onClick={() => removeLine(line.product.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(line.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center text-sm">{line.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(line.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium">{formatMoney(line.product.price * line.quantity)}</span>
                    </div>
                    <Input
                      placeholder="Observações (ex: sem cebola)"
                      value={line.notes}
                      onChange={(e) => updateNotes(line.product.id, e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer_name">Cliente</Label>
                <Input id="customer_name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_phone">Telefone</Label>
                <Input id="customer_phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de pedido</Label>
                <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(orderTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === "DELIVERY" && (
                <div className="space-y-1.5">
                  <Label htmlFor="customer_address">Endereço de entrega</Label>
                  <Textarea
                    id="customer_address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input id="discount" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                {type === "DELIVERY" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="delivery_fee">Taxa de entrega (R$)</Label>
                    <Input
                      id="delivery_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Observações do pedido</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between font-display text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            {error && (
              <p className={cn("rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive")}>{error}</p>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={submitting || cart.length === 0}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalizar pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
