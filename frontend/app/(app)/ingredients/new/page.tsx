"use client";

import { PageContainer } from "@/components/layout/page-container";
import { IngredientForm } from "@/components/ingredients/ingredient-form";
import { useCreateIngredient } from "@/hooks/use-ingredients";

export default function NewIngredientPage() {
  const createIngredient = useCreateIngredient();

  return (
    <PageContainer title="Novo ingrediente">
      <div className="mx-auto w-full max-w-2xl">
        <IngredientForm
          submitLabel="Criar ingrediente"
          backHref="/ingredients"
          onSubmit={(payload) => createIngredient.mutateAsync(payload)}
        />
      </div>
    </PageContainer>
  );
}
