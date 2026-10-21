package com.burgerpizzahouse.domain;

public enum PaymentMethod {
    CASH("Dinheiro"),
    CREDIT_CARD("Cartão de crédito"),
    DEBIT_CARD("Cartão de débito"),
    PIX("Pix"),
    IFOOD("iFood"),
    MEAL_TICKET("Vale-refeição");

    private final String label;

    PaymentMethod(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
