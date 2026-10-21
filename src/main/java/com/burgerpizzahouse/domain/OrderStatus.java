package com.burgerpizzahouse.domain;

import java.util.List;

/**
 * Ciclo de vida do pedido. Um pedido só avança no fluxo (ou é cancelado a partir de um
 * estado não terminal); nunca "volta" nem pula etapas, e nada muda a partir de um estado terminal.
 */
public enum OrderStatus {
    PENDING("Pendente", "st-pending"),
    CONFIRMED("Confirmado", "st-confirmed"),
    PREPARING("Preparando", "st-preparing"),
    READY("Pronto", "st-ready"),
    DELIVERING("Saiu para entrega", "st-delivering"),
    DELIVERED("Entregue", "st-delivered"),
    CANCELLED("Cancelado", "st-cancelled");

    private final String label;
    private final String cssClass;

    OrderStatus(String label, String cssClass) {
        this.label = label;
        this.cssClass = cssClass;
    }

    public String getLabel() {
        return label;
    }

    public String getCssClass() {
        return cssClass;
    }

    public List<OrderStatus> allowedNext() {
        return switch (this) {
            case PENDING -> List.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> List.of(PREPARING, CANCELLED);
            case PREPARING -> List.of(READY, CANCELLED);
            case READY -> List.of(DELIVERING, DELIVERED, CANCELLED);
            case DELIVERING -> List.of(DELIVERED, CANCELLED);
            case DELIVERED, CANCELLED -> List.of();
        };
    }

    public boolean canTransitionTo(OrderStatus next) {
        return allowedNext().contains(next);
    }

    /** Pedidos ainda em andamento (contados no card "em andamento" do dashboard). */
    public static List<OrderStatus> openStatuses() {
        return List.of(PENDING, CONFIRMED, PREPARING);
    }
}
