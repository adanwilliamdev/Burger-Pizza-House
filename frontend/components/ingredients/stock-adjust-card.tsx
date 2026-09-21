"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdjustStock } from "@/hooks/use-ingredients";
import { ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Ingredient } from "@/lib/types";

export function StockAdjustCard({ ingredient }: { ingredient: Ingredient }) {
  const { toast } = useToast();
  const adjustStock = useAdjustStock(ingredient.id);
  const [operation, setOperation] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(quantity);
    if (!value || value <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }
    setSubmitting(true);
    try {
      await adjustStock.mutateAsync({ operation, quantity: value });
      toast(
        operation === "add"
          ? `${value} ${ingredient.unit} adicionado(s) ao estoque.`
          : `${value} ${ingredient.unit} removido(s) do estoque.`,
        "success"
      );
      setQuantity("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível ajustar o estoque.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustar estoque</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="w-32 space-y-1.5">
            <Select value={operation} onValueChange={(v) => setOperation(v as "add" | "remove")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Adicionar</SelectItem>
                <SelectItem value="remove">Remover</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1.5">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={`Qtd. (${ingredient.unit})`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={submitting}>
            Confirmar
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Estoque atual: {ingredient.current_stock} {ingredient.unit}
          </p>
          {error && <p className="w-full text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
