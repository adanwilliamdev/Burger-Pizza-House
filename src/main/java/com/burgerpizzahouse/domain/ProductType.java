package com.burgerpizzahouse.domain;

public enum ProductType {
    SIMPLE("Simples"),
    PIZZA_HALF("Meia Pizza"),
    PIZZA_QUARTER("Pizza em 1/4"),
    COMBO("Combo");

    private final String label;

    ProductType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
