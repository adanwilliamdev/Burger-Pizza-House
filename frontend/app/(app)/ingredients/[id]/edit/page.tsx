"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { IngredientForm } from "@/components/ingredients/ingredient-form";
import { StockAdjustCard } from "@/components/ingredients/stock-adjust-card";
import { useIngredient, useUpdateIngredient } from "@/hooks/use-ingredients";

export default function EditIngredientPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: ingredient, isLoading } = useIngredient(id);
  const updateIngredient = useUpdateIngredient(id);

  return (
    <PageContainer title="Editar ingrediente">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {isLoading || !ingredient ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <StockAdjustCard ingredient={ingredient} />
            <IngredientForm
              initial={ingredient}
              submitLabel="Salvar alterações"
              backHref="/ingredients"
              onSubmit={(payload) => updateIngredient.mutateAsync(payload)}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
