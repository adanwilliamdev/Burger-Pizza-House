"use client";

import { PageContainer } from "@/components/layout/page-container";
import { ProductForm } from "@/components/products/product-form";
import { useCreateProduct } from "@/hooks/use-products";

export default function NewProductPage() {
  const createProduct = useCreateProduct();

  return (
    <PageContainer title="Novo produto">
      <div className="mx-auto w-full max-w-3xl">
        <ProductForm submitLabel="Criar produto" onSubmit={(payload) => createProduct.mutateAsync(payload)} />
      </div>
    </PageContainer>
  );
}
