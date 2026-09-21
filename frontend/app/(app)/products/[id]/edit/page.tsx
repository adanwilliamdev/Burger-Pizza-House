"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ProductForm } from "@/components/products/product-form";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct(id);

  return (
    <PageContainer title="Editar produto">
      <div className="mx-auto w-full max-w-3xl">
        {isLoading || !product ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ProductForm
            initial={product}
            submitLabel="Salvar alterações"
            onSubmit={(payload) => updateProduct.mutateAsync(payload)}
          />
        )}
      </div>
    </PageContainer>
  );
}
