package com.burgerpizzahouse.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.service.OrderService.OrderFilter;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** Links de paginação da tela de pedidos: preservam os filtros e codificam os valores. */
class OrderViewControllerTest {

    @Test
    void withoutFiltersFirstPageIsPlainPath() {
        assertEquals("/orders", OrderViewController.listHref(new OrderFilter(null, null, null, null, ""), 0));
        assertEquals("/orders?page=3", OrderViewController.listHref(new OrderFilter(null, null, null, null, null), 3));
    }

    @Test
    void keepsEveryFilterAndTheDatesInIsoFormat() {
        OrderFilter filter = new OrderFilter(OrderStatus.PENDING, OrderType.DELIVERY,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 13), "maria");
        assertEquals("/orders?status=PENDING&type=DELIVERY&q=maria&start_date=2026-11-01&end_date=2026-11-13&page=2",
                OrderViewController.listHref(filter, 2));
    }

    @Test
    void searchTextIsEncodedSoItCannotInjectParameters() {
        String href = OrderViewController.listHref(new OrderFilter(null, null, null, null, "A&B c+d#1"), 1);
        assertTrue(href.startsWith("/orders?q="), href);
        assertFalse(href.contains(" "), href);
        assertFalse(href.contains("&B"), href);
        assertTrue(href.contains("%26"), href);
        assertTrue(href.contains("%2B"), href);
        assertTrue(href.endsWith("&page=1"), href);
    }
}
