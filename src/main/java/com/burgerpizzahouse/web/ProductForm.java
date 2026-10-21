package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.ProductType;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Formulário de produto (com as linhas da receita). */
public class ProductForm {

    /** Linhas em branco extras exibidas no formulário para montar a receita. */
    public static final int EXTRA_RECIPE_ROWS = 5;

    public static class RecipeLineForm {
        private Long ingredientId;
        private BigDecimal quantity;
        private String unit;

        public Long getIngredientId() {
            return ingredientId;
        }

        public void setIngredientId(Long ingredientId) {
            this.ingredientId = ingredientId;
        }

        public BigDecimal getQuantity() {
            return quantity;
        }

        public void setQuantity(BigDecimal quantity) {
            this.quantity = quantity;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }
    }

    @NotBlank(message = "Informe o nome do produto.")
    @Size(max = 150, message = "O nome pode ter no máximo 150 caracteres.")
    private String name;

    private String description;

    @NotNull(message = "Informe um preço válido.")
    @DecimalMin(value = "0", message = "O preço não pode ser negativo.")
    private BigDecimal price;

    @DecimalMin(value = "0", message = "O custo não pode ser negativo.")
    private BigDecimal cost = BigDecimal.ZERO;

    private Category category = Category.PIZZA;
    private ProductType type = ProductType.SIMPLE;
    private boolean active = true;
    private String image;
    private Integer preparationTime = 15;
    private List<RecipeLineForm> lines = new ArrayList<>();

    public static ProductForm empty() {
        ProductForm form = new ProductForm();
        form.padRecipeRows();
        return form;
    }

    public static ProductForm from(ProductResponse p) {
        ProductForm form = new ProductForm();
        form.name = p.name();
        form.description = p.description();
        form.price = p.price();
        form.cost = p.cost();
        form.category = p.category();
        form.type = p.type();
        form.active = p.isActive();
        form.image = p.image();
        form.preparationTime = p.preparationTime();
        p.ingredients().forEach(line -> {
            RecipeLineForm row = new RecipeLineForm();
            row.setIngredientId(line.ingredientId());
            row.setQuantity(line.quantity());
            row.setUnit(line.unit());
            form.lines.add(row);
        });
        form.padRecipeRows();
        return form;
    }

    /** Garante linhas em branco ao final para o usuário preencher. */
    public void padRecipeRows() {
        for (int i = 0; i < EXTRA_RECIPE_ROWS; i++) {
            lines.add(new RecipeLineForm());
        }
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getCost() {
        return cost;
    }

    public void setCost(BigDecimal cost) {
        this.cost = cost;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public ProductType getType() {
        return type;
    }

    public void setType(ProductType type) {
        this.type = type;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Integer getPreparationTime() {
        return preparationTime;
    }

    public void setPreparationTime(Integer preparationTime) {
        this.preparationTime = preparationTime;
    }

    public List<RecipeLineForm> getLines() {
        return lines;
    }

    public void setLines(List<RecipeLineForm> lines) {
        this.lines = lines;
    }
}
