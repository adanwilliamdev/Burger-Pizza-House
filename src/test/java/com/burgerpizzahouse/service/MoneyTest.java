package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MoneyTest {

    @Test
    void roundsHalfUpToTwoDecimals() {
        assertEquals(new BigDecimal("0.30"), Money.round(new BigDecimal("0.1").add(new BigDecimal("0.2"))));
        assertEquals(new BigDecimal("2.68"), Money.round(new BigDecimal("2.675")));
        assertEquals(new BigDecimal("45.90"), Money.round(new BigDecimal("45.9")));
    }

    @Test
    void nullIsZero() {
        assertEquals(BigDecimal.ZERO, Money.orZero(null));
    }
}
