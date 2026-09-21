"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
import { useIngredients } from "@/hooks/use-ingredients";
import type { ProductPayload } from "@/hooks/use-products";
import { categoryLabels, productTypeLabels } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { Product, ProductIngredientLine } from "@/lib/types";
import { ApiClientError } from "@/lib/api";

interface ProductFormProps {
  initial?: Product;
  onSubmit: (payload: ProductPayload) => Promise<unknown>;
  submitLabel: string;
}

export function ProductForm({ initial, onSubmit, submitLabel }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: ingredients } = useIngredients();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price.toString() ?? "");
  const [cost, setCost] = useState(initial?.cost.toString() ?? "0");
  const [category, setCategory] = useState(initial?.category ?? "PIZZA");
  const [type, setType] = useState(initial?.type ?? "SIMPLE");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [preparationTime, setPreparationTime] = useState(initial?.preparation_time.toString() ?? "15");
  const [recipe, setRecipe] = useState<ProductIngredientLine[]>(initial?.ingredients ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRecipeLine() {
    const first = ingredients?.[0];
    if (!first) return;
    setRecipe((prev) => [...prev, { ingredient_id: first.id, quantity: 1, unit: first.unit }]);
  }

  function updateRecipeLine(index: number, patch: Partial<ProductIngredientLine>) {
    setRecipe((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeRecipeLine(index: number) {
    setRecipe((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setError("Informe um preço válido.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        price: priceValue,
        cost: Number(cost) || 0,
        category,
        type,
        is_active: isActive,
        image: initial?.image ?? null,
        preparation_time: Number(preparationTime) || 15,
        ingredients: recipe,
      });
      toast(`Produto "${name}" salvo com sucesso.`, "success");
      router.push("/products");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Preço de venda (R$)</Label>
            <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cost">Custo estimado (R$)</Label>
            <Input id="cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(productTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preparation_time">Tempo de preparo (min)</Label>
            <Input
              id="preparation_time"
              type="number"
              min="1"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Receita (ingredientes)</CardTitle>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRecipeLine}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar ingrediente
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {recipe.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Este produto ainda não consome ingredientes do estoque.
            </p>
          )}
          {recipe.map((line, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs">Ingrediente</Label>
                <Select
                  value={String(line.ingredient_id)}
                  onValueChange={(v) => {
                    const ing = ingredients?.find((i) => i.id === Number(v));
                    updateRecipeLine(index, { ingredient_id: Number(v), unit: ing?.unit ?? line.unit });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients?.map((ing) => (
                      <SelectItem key={ing.id} value={String(ing.id)}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateRecipeLine(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Unidade</Label>
                <Input value={line.unit} onChange={(e) => updateRecipeLine(index, { unit: e.target.value })} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipeLine(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/products")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
