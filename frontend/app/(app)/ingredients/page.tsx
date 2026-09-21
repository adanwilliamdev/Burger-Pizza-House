"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteIngredient, useIngredients } from "@/hooks/use-ingredients";
import { useAuth } from "@/lib/auth";
import { ApiClientError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { formatMoney } from "@/lib/utils";

export default function IngredientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data: ingredients, isLoading } = useIngredients(lowStockOnly);
  const deleteIngredient = useDeleteIngredient();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Excluir o ingrediente "${name}"?`)) return;
    try {
      await deleteIngredient.mutateAsync(id);
      toast("Ingrediente excluído.", "success");
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "Não foi possível excluir.", "error");
    }
  }

  return (
    <PageContainer
      title="Ingredientes"
      actions={
        isAdmin && (
          <Button onClick={() => router.push("/ingredients/new")}>
            <Plus className="h-4 w-4" />
            Novo ingrediente
          </Button>
        )
      }
    >
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Somente estoque baixo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Carregando ingredientes…</p>
          ) : ingredients && ingredients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estoque atual</TableHead>
                  <TableHead>Estoque mínimo</TableHead>
                  <TableHead>Custo/unidade</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {ingredient.current_stock} {ingredient.unit}
                        {ingredient.is_low_stock && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Baixo
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ingredient.min_stock} {ingredient.unit}
                    </TableCell>
                    <TableCell>{formatMoney(ingredient.cost_per_unit)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/ingredients/${ingredient.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ingredient.id, ingredient.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">Nenhum ingrediente encontrado.</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
