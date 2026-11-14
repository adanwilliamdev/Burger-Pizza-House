package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.Order;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.dto.OrderDtos.OrderSummaryResponse;
import com.burgerpizzahouse.repository.AuditLogRepository;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.OrderRepository;
import com.burgerpizzahouse.repository.ProductIngredientRepository;
import com.burgerpizzahouse.repository.ProductRepository;
import com.burgerpizzahouse.repository.StockMovementRepository;
import com.burgerpizzahouse.repository.UserRepository;
import com.burgerpizzahouse.service.OrderService.OrderFilter;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;

/** Listagem paginada: total, offset/limite repassados ao repositório e DTO resumido (sem itens nem usuário). */
class OrderListingTest {

    private OrderRepository orders;
    private OrderService service;

    @BeforeEach
    void setUp() {
        orders = mock(OrderRepository.class);
        AppProperties props = new AppProperties("development", "America/Sao_Paulo", "", null, null, null);
        service = new OrderService(orders, mock(ProductRepository.class), mock(ProductIngredientRepository.class),
                mock(IngredientRepository.class), mock(StockMovementRepository.class), mock(AuditLogRepository.class),
                mock(UserRepository.class), mock(JdbcTemplate.class), mock(ApplicationEventPublisher.class), props);
    }

    private static OrderFilter noFilter() {
        return new OrderFilter(null, null, null, null, null);
    }

    @Test
    void summaryPageCarriesTotalAndOffset() {
        // usuário null: se o resumo tentasse tocar no usuário (ou nos itens), este teste quebraria
        Order order = new Order(7, null);
        order.setCustomerName("Maria");
        Page<Order> repoPage = new PageImpl<>(List.of(order), org.springframework.data.domain.PageRequest.of(2, 20), 135);
        when(orders.findAll(any(Specification.class), any(Pageable.class))).thenReturn(repoPage);

        Page<OrderSummaryResponse> page = service.listSummaries(noFilter(), 20, 40);

        assertEquals(135, page.getTotalElements());
        assertEquals(1, page.getContent().size());
        OrderSummaryResponse row = page.getContent().get(0);
        assertEquals(7, row.number());
        assertEquals("Maria", row.customerName());
        assertEquals(OrderStatus.PENDING, row.status());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(orders).findAll(any(Specification.class), pageable.capture());
        assertEquals(40, pageable.getValue().getOffset());
        assertEquals(20, pageable.getValue().getPageSize());
        assertTrue(pageable.getValue().getSort().getOrderFor("createdAt").isDescending(), "mais recentes primeiro");
    }
}
