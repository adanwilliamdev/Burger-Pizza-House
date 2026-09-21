"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IngredientPayload } from "@/hooks/use-ingredients";
import { ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Ingredient } from "@/lib/types";

interface IngredientFormProps {
  initial?: Ingredient;
  onSubmit: (payload: IngredientPayload) => Promise<unknown>;
  submitLabel: string;
  backHref: string;
}

export function IngredientForm({ initial, onSubmit, submitLabel, backHref }: IngredientFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "g");
  const [currentStock, setCurrentStock] = useState(initial?.current_stock.toString() ?? "0");
  const [minStock, setMinStock] = useState(initial?.min_stock.toString() ?? "0");
  const [costPerUnit, setCostPerUnit] = useState(initial?.cost_per_unit.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do ingrediente.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit,
        current_stock: Number(currentStock) || 0,
        min_stock: Number(minStock) || 0,
        cost_per_unit: Number(costPerUnit) || 0,
      });
      toast(`Ingrediente "${name}" salvo com sucesso.`, "success");
      router.push(backHref);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar o ingrediente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do ingrediente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit">Unidade de medida</Label>
            <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, kg, L, un…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost_per_unit">Custo por unidade (R$)</Label>
            <Input
              id="cost_per_unit"
              type="number"
              min="0"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="current_stock">Estoque atual</Label>
            <Input
              id="current_stock"
              type="number"
              min="0"
              step="0.01"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min_stock">Estoque mínimo</Label>
            <Input
              id="min_stock"
              type="number"
              min="0"
              step="0.01"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Abaixo deste valor, o ingrediente aparece como estoque baixo no dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
