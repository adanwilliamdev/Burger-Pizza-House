package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientRequest;
import com.burgerpizzahouse.dto.CatalogDtos.ProductRequest;
import com.burgerpizzahouse.dto.CatalogDtos.RecipeLineRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Teste de integração com concorrência real. Exige Postgres e Redis no ar
 * (veja o README); roda com {@code mvn verify}.
 */
@SpringBootTest
class OrderConcurrencyIT {

    @Autowired
    OrderService orders;
    @Autowired
    IngredientService ingredients;
    @Autowired
    ProductService products;
    @Autowired
    UserRepository users;

    record Fixture(Long ingredientId, Long productId) {
    }

    private Long adminId() {
        return users.findByEmailIgnoreCase(SeedService.ADMIN_EMAIL).orElseThrow().getId();
    }

    private Fixture fixture(String stock) {
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        var ingredient = ingredients.create(new IngredientRequest("Teste-" + suffix, "un",
                new BigDecimal(stock), BigDecimal.ZERO, BigDecimal.ONE));
        var product = products.create(new ProductRequest("Produto-" + suffix, null, BigDecimal.TEN, null,
                Category.SIDE, null, null, null, null,
                List.of(new RecipeLineRequest(ingredient.id(), BigDecimal.ONE, "un"))));
        return new Fixture(ingredient.id(), product.id());
    }

    private OrderCreateRequest order(Long productId, int quantity) {
        return new OrderCreateRequest(null, null, null, OrderType.TAKEAWAY, PaymentMethod.PIX,
                List.of(new OrderItemRequest(productId, quantity, null, null)), null, null, null);
    }

    private BigDecimal stock(Long ingredientId) {
        return ingredients.get(ingredientId).currentStock();
    }

    /** Executa a tarefa em n threads liberadas ao mesmo tempo; devolve o resultado ou a exceção de cada uma. */
    private List<Object> concurrently(int n, Callable<Object> task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            futures.add(pool.submit(() -> {
                go.await();
                return task.call();
            }));
        }
        go.countDown();
        List<Object> results = new ArrayList<>();
        for (Future<Object> f : futures) {
            try {
                results.add(f.get());
            } catch (ExecutionException e) {
                results.add(e.getCause());
            }
        }
        pool.shutdown();
        return results;
    }

    @Test
    void concurrentOrdersNeverOversell() throws Exception {
        Fixture fx = fixture("1");

        List<Object> results = concurrently(6, () -> orders.create(adminId(), order(fx.productId(), 1)));

        long created = results.stream().filter(r -> r instanceof OrderResponse).count();
        long refused = results.stream().filter(r -> r instanceof InsufficientStockException).count();
        assertEquals(1, created);
        assertEquals(5, refused);
        assertEquals(0, stock(fx.ingredientId()).signum());
    }

    @Test
    void orderNumbersAreUniqueUnderConcurrency() throws Exception {
        Fixture fx = fixture("50");

        List<Object> results = concurrently(8, () -> orders.create(adminId(), order(fx.productId(), 1)));

        Set<Integer> numbers = new HashSet<>();
        for (Object r : results) {
            OrderResponse created = assertInstanceOf(OrderResponse.class, r);
            numbers.add(created.number());
        }
        assertEquals(8, numbers.size());
    }

    @Test
    void cancelReturnsStockExactlyOnce() throws Exception {
        Fixture fx = fixture("5");
        OrderResponse created = orders.create(adminId(), order(fx.productId(), 3));
        assertEquals(0, stock(fx.ingredientId()).compareTo(new BigDecimal("2")));

        // dois cancelamentos simultâneos: só um pode valer
        List<Object> results = concurrently(2,
                () -> orders.updateStatus(created.id(), OrderStatus.CANCELLED, adminId()));

        long ok = results.stream().filter(r -> r instanceof OrderResponse).count();
        long conflicts = results.stream().filter(r -> r instanceof BusinessException).count();
        assertEquals(1, ok);
        assertEquals(1, conflicts);
        assertEquals(0, stock(fx.ingredientId()).compareTo(new BigDecimal("5")));
    }

    @Test
    void insufficientStockReportsTheShortage() {
        Fixture fx = fixture("1");

        InsufficientStockException e = org.junit.jupiter.api.Assertions.assertThrows(
                InsufficientStockException.class, () -> orders.create(adminId(), order(fx.productId(), 2)));

        assertTrue(e.describe().contains("Estoque insuficiente"));
        assertEquals(1, e.getShortages().size());
    }
}
