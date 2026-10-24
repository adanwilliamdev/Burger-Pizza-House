package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.domain.Product;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemRequest;
import com.burgerpizzahouse.repository.AuditLogRepository;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.OrderRepository;
import com.burgerpizzahouse.repository.ProductIngredientRepository;
import com.burgerpizzahouse.repository.ProductRepository;
import com.burgerpizzahouse.repository.StockMovementRepository;
import com.burgerpizzahouse.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

/** Validações de {@link OrderService#create} que acontecem ANTES de qualquer lock ou baixa de estoque. */
class OrderServiceTest {

    private OrderRepository orders;
    private ProductRepository products;
    private ProductIngredientRepository recipeLines;
    private IngredientRepository ingredients;
    private StockMovementRepository movements;
    private AuditLogRepository audits;
    private OrderService service;

    @BeforeEach
    void setUp() {
        orders = mock(OrderRepository.class);
        products = mock(ProductRepository.class);
        recipeLines = mock(ProductIngredientRepository.class);
        ingredients = mock(IngredientRepository.class);
        movements = mock(StockMovementRepository.class);
        audits = mock(AuditLogRepository.class);
        AppProperties props = new AppProperties("development", "America/Sao_Paulo", "", null, null, null);
        service = new OrderService(orders, products, recipeLines, ingredients, movements, audits,
                mock(UserRepository.class), mock(JdbcTemplate.class), mock(ApplicationEventPublisher.class), props);
    }

    private Product product(long id, String price, boolean active) {
        Product p = new Product("Produto " + id);
        ReflectionTestUtils.setField(p, "id", id);
        p.setPrice(new BigDecimal(price));
        p.setActive(active);
        return p;
    }

    private OrderCreateRequest request(List<OrderItemRequest> items, BigDecimal discount) {
        return new OrderCreateRequest(null, null, null, OrderType.TAKEAWAY, PaymentMethod.PIX, items, discount, null, null);
    }

    private void assertNothingWasTouched() {
        verifyNoInteractions(ingredients, movements, audits, orders, recipeLines);
    }

    @Test
    void rejectsOrderWithoutItems() {
        BusinessException e = assertThrows(BusinessException.class, () -> service.create(1L, request(List.of(), null)));
        assertTrue(e.getMessage().contains("ao menos um item"));
        assertNothingWasTouched();
    }

    @Test
    void rejectsUnknownProduct() {
        when(products.findAllById(org.mockito.ArgumentMatchers.<Iterable<Long>>any())).thenReturn(List.of());
        BusinessException e = assertThrows(BusinessException.class,
                () -> service.create(1L, request(List.of(new OrderItemRequest(99L, 1, null, null)), null)));
        assertEquals(HttpStatus.NOT_FOUND, e.getStatus());
        assertNothingWasTouched();
    }

    @Test
    void rejectsInactiveProduct() {
        when(products.findAllById(org.mockito.ArgumentMatchers.<Iterable<Long>>any()))
                .thenReturn(List.of(product(1L, "10.00", false)));
        BusinessException e = assertThrows(BusinessException.class,
                () -> service.create(1L, request(List.of(new OrderItemRequest(1L, 1, null, null)), null)));
        assertTrue(e.getMessage().contains("não está mais disponível"));
        assertNothingWasTouched();
    }

    @Test
    void rejectsDiscountGreaterThanSubtotal() {
        when(products.findAllById(org.mockito.ArgumentMatchers.<Iterable<Long>>any()))
                .thenReturn(List.of(product(1L, "10.00", true)));
        BusinessException e = assertThrows(BusinessException.class,
                () -> service.create(1L, request(List.of(new OrderItemRequest(1L, 1, null, null)),
                        new BigDecimal("10.01"))));
        assertTrue(e.getMessage().contains("desconto"));
        assertNothingWasTouched();
    }
}
