package com.burgerpizzahouse.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Arredondamento monetário: 2 casas decimais, meio para cima. */
public final class Money {

    private Money() {
    }

    public static BigDecimal round(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    /** Trata null como zero. */
    public static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
