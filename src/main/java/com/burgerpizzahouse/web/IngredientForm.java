package com.burgerpizzahouse.web;

import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public class IngredientForm {

    @NotBlank(message = "Informe o nome do ingrediente.")
    @Size(max = 150, message = "O nome pode ter no máximo 150 caracteres.")
    private String name;

    @Size(max = 10, message = "A unidade pode ter no máximo 10 caracteres.")
    private String unit = "g";

    @DecimalMin(value = "0", message = "O estoque atual não pode ser negativo.")
    private BigDecimal currentStock = BigDecimal.ZERO;

    @DecimalMin(value = "0", message = "O estoque mínimo não pode ser negativo.")
    private BigDecimal minStock = BigDecimal.ZERO;

    @NotNull(message = "Informe o custo por unidade.")
    @DecimalMin(value = "0", message = "O custo por unidade não pode ser negativo.")
    private BigDecimal costPerUnit;

    public static IngredientForm from(IngredientResponse i) {
        IngredientForm form = new IngredientForm();
        form.name = i.name();
        form.unit = i.unit();
        form.currentStock = i.currentStock();
        form.minStock = i.minStock();
        form.costPerUnit = i.costPerUnit();
        return form;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(BigDecimal currentStock) {
        this.currentStock = currentStock;
    }

    public BigDecimal getMinStock() {
        return minStock;
    }

    public void setMinStock(BigDecimal minStock) {
        this.minStock = minStock;
    }

    public BigDecimal getCostPerUnit() {
        return costPerUnit;
    }

    public void setCostPerUnit(BigDecimal costPerUnit) {
        this.costPerUnit = costPerUnit;
    }
}
