package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.domain.OrderStatus;
import java.util.List;
import org.junit.jupiter.api.Test;

class OrderStatusTest {

    @Test
    void orderAdvancesThroughTheFlow() {
        assertTrue(OrderStatus.PENDING.canTransitionTo(OrderStatus.CONFIRMED));
        assertTrue(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.PREPARING));
        assertTrue(OrderStatus.PREPARING.canTransitionTo(OrderStatus.READY));
        assertTrue(OrderStatus.READY.canTransitionTo(OrderStatus.DELIVERING));
        assertTrue(OrderStatus.READY.canTransitionTo(OrderStatus.DELIVERED));
        assertTrue(OrderStatus.DELIVERING.canTransitionTo(OrderStatus.DELIVERED));
    }

    @Test
    void neverGoesBackOrSkipsSteps() {
        assertFalse(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.PENDING));
        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.READY));
        assertFalse(OrderStatus.PREPARING.canTransitionTo(OrderStatus.DELIVERED));
    }

    @Test
    void terminalStatesAreFinal() {
        assertTrue(OrderStatus.DELIVERED.allowedNext().isEmpty());
        assertTrue(OrderStatus.CANCELLED.allowedNext().isEmpty());
    }

    @Test
    void cancellationIsAllowedFromEveryNonTerminalState() {
        for (OrderStatus status : OrderStatus.values()) {
            boolean terminal = status == OrderStatus.DELIVERED || status == OrderStatus.CANCELLED;
            assertEquals(!terminal, status.canTransitionTo(OrderStatus.CANCELLED), status.name());
        }
    }

    @Test
    void openStatusesAreTheEarlyOnes() {
        assertEquals(List.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING),
                OrderStatus.openStatuses());
    }
}
