package com.burgerpizzahouse.domain;

public enum OrderType {
    DELIVERY("Entrega"),
    TAKEAWAY("Retirada"),
    TABLE("Mesa");

    private final String label;

    OrderType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
