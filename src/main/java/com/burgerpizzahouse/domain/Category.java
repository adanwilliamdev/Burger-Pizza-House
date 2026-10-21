package com.burgerpizzahouse.domain;

public enum Category {
    PIZZA("Pizza"),
    HAMBURGUER("Hambúrguer"),
    DRINK("Bebida"),
    DESSERT("Sobremesa"),
    SIDE("Acompanhamento");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
