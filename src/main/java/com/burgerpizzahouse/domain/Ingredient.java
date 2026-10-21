package com.burgerpizzahouse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "ingredients")
public class Ingredient extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 10)
    private String unit = "g";

    @Column(name = "current_stock", nullable = false, precision = 14, scale = 4)
    private BigDecimal currentStock = BigDecimal.ZERO;

    @Column(name = "min_stock", nullable = false, precision = 14, scale = 4)
    private BigDecimal minStock = BigDecimal.ZERO;

    @Column(name = "cost_per_unit", nullable = false, precision = 12, scale = 4)
    private BigDecimal costPerUnit = BigDecimal.ZERO;

    protected Ingredient() {
    }

    public Ingredient(String name, String unit, BigDecimal currentStock, BigDecimal minStock, BigDecimal costPerUnit) {
        this.name = name;
        this.unit = unit;
        this.currentStock = currentStock;
        this.minStock = minStock;
        this.costPerUnit = costPerUnit;
    }

    public boolean isLowStock() {
        return currentStock.compareTo(minStock) <= 0;
    }

    public Long getId() {
        return id;
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
