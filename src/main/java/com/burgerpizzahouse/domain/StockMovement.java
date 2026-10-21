package com.burgerpizzahouse.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Livro-razão de estoque: toda entrada/saída de ingrediente vira uma linha. É o que permite devolver
 * ao estoque exatamente o que um pedido consumiu quando ele é cancelado (mesmo que a receita tenha
 * mudado depois) e auditar de onde veio cada variação de saldo.
 *
 * <p>delta &lt; 0 = saída; delta &gt; 0 = entrada.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ingredient_id", nullable = false)
    private Long ingredientId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal delta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StockReason reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StockMovement() {
    }

    public StockMovement(Long ingredientId, Long orderId, Long userId, BigDecimal delta, StockReason reason) {
        this.ingredientId = ingredientId;
        this.orderId = orderId;
        this.userId = userId;
        this.delta = delta;
        this.reason = reason;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getIngredientId() {
        return ingredientId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public Long getUserId() {
        return userId;
    }

    public BigDecimal getDelta() {
        return delta;
    }

    public StockReason getReason() {
        return reason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
