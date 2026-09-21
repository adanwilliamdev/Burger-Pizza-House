"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteProduct, useProducts } from "@/hooks/use-products";
import { useAuth } from "@/lib/auth";
import { categoryLabels } from "@/lib/labels";
import { useToast } from "@/lib/toast";
import type { Category } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [activeOnly, setActiveOnly] = useState<"true" | "false" | "">("true");

  const { data: products, isLoading } = useProducts({ category, is_active: activeOnly, q });
  const deleteProduct = useDeleteProduct();

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Excluir "${name}"? Se já houver pedidos com esse produto, ele será apenas desativado.`)) return;
    try {
      const result = await deleteProduct.mutateAsync(id);
      toast(result.message, result.deactivated ? "info" : "success");
    } catch {
      toast("Não foi possível excluir o produto.", "error");
    }
  }

  return (
    <PageContainer
      title="Produtos"
      actions={
        isAdmin && (
          <Button onClick={() => router.push("/products/new")}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        )
      }
    >
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Input
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : (v as Category))}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeOnly || "all"} onValueChange={(v) => setActiveOnly(v === "all" ? "" : (v as "true" | "false"))}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Carregando produtos…</p>
          ) : products && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Situação</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{categoryLabels[product.category]}</TableCell>
                    <TableCell>{formatMoney(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "success" : "secondary"}>
                        {product.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/products/${product.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id, product.name)}
                          >
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
            <p className="p-5 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
