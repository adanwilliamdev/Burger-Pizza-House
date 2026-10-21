package com.burgerpizzahouse.domain;

public enum Role {
    ADMIN("Administrador"),
    MANAGER("Gerente"),
    OPERATOR("Operador");

    private final String label;

    Role(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
