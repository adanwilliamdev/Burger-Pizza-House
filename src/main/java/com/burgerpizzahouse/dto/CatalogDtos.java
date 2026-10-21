package com.burgerpizzahouse.dto;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.ProductType;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** DTOs de catálogo (ingredientes e produtos). Os nomes JSON saem em snake_case. */
public final class CatalogDtos {

    private CatalogDtos() {
    }

    // ------------------------------------------------------------ ingredientes

    public record IngredientRequest(
            @NotBlank(message = "Informe o nome do ingrediente.") @Size(max = 150) String name,
            @Size(max = 10) String unit,
            @DecimalMin(value = "0", message = "O estoque atual não pode ser negativo.") BigDecimal currentStock,
            @DecimalMin(value = "0", message = "O estoque mínimo não pode ser negativo.") BigDecimal minStock,
            @NotNull(message = "Informe o custo por unidade.")
            @DecimalMin(value = "0", message = "O custo por unidade não pode ser negativo.") BigDecimal costPerUnit) {
    }

    public record IngredientResponse(
            Long id,
            String name,
            String unit,
            BigDecimal currentStock,
            BigDecimal minStock,
            BigDecimal costPerUnit,
            Instant createdAt,
            Instant updatedAt,
            @JsonProperty("is_low_stock") boolean isLowStock) {
    }

    public record StockAdjustRequest(
            @NotNull @Pattern(regexp = "add|remove", message = "A operação deve ser \"add\" ou \"remove\".") String operation,
            @NotNull @DecimalMin(value = "0", inclusive = false, message = "Informe uma quantidade maior que zero.")
            BigDecimal quantity) {
    }

    // ---------------------------------------------------------------- produtos

    public record RecipeLineRequest(
            @NotNull(message = "Informe o ingrediente da receita.") Long ingredientId,
            @NotNull @DecimalMin(value = "0", inclusive = false, message = "A quantidade da receita deve ser maior que zero.")
            BigDecimal quantity,
            @Size(max = 10) String unit) {
    }

    public record ProductRequest(
            @NotBlank(message = "Informe o nome do produto.") @Size(max = 150) String name,
            String description,
            @NotNull(message = "Informe o preço.") @DecimalMin(value = "0", message = "O preço não pode ser negativo.")
            BigDecimal price,
            @DecimalMin(value = "0", message = "O custo não pode ser negativo.") BigDecimal cost,
            Category category,
            ProductType type,
            @JsonProperty("is_active") Boolean isActive,
            @Size(max = 500) String image,
            Integer preparationTime,
            @Valid List<RecipeLineRequest> ingredients) {
    }

    public record RecipeLineResponse(
            Long id,
            Long ingredientId,
            String ingredientName,
            BigDecimal quantity,
            String unit) {
    }

    public record ProductResponse(
            Long id,
            String name,
            String description,
            BigDecimal price,
            BigDecimal cost,
            Category category,
            ProductType type,
            @JsonProperty("is_active") boolean isActive,
            String image,
            int preparationTime,
            Instant createdAt,
            Instant updatedAt,
            List<RecipeLineResponse> ingredients) {
    }

    public record ProductDeleteResponse(boolean deactivated, String message) {
    }
}
