package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Meio a meio (preço e estoque proporcional), cancelamento com destino do estoque e pagamento com troco. */
@SpringBootTest
class OrderHalfCancelPaymentIT {

    @Autowired
    OrderService orders;
    @Autowired
    IngredientService ingredients;
    @Autowired
    ProductService products;
    @Autowired
    UserRepository users;

    record Item(Long ingredientId, Long productId, String productName) {
    }

    private Long adminId() {
        return users.findByEmailIgnoreCase(SeedService.ADMIN_EMAIL).orElseThrow().getId();
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    /** Ingrediente com estoque + produto que consome 1 unidade dele por unidade vendida. */
    private Item item(Category category, String price, String stock) {
        String s = suffix();
        var ingredient = ingredients.create(new IngredientRequest("Ing-" + s, "un", new BigDecimal(stock),
                BigDecimal.ZERO, BigDecimal.ONE));
        String name = "Prod-" + s;
        var product = products.create(new ProductRequest(name, null, new BigDecimal(price), null, category, null,
                null, null, null, List.of(new RecipeLineRequest(ingredient.id(), BigDecimal.ONE, "un"))));
        return new Item(ingredient.id(), product.id(), name);
    }

    private OrderCreateRequest order(PaymentMethod method, Long productId, int quantity, List<String> flavors) {
        return new OrderCreateRequest(null, null, null, OrderType.TAKEAWAY, method,
                List.of(new OrderItemRequest(productId, quantity, null, flavors)), null, null, null);
    }

    private BigDecimal stock(Long ingredientId) {
        return ingredients.get(ingredientId).currentStock();
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "esperado " + expected + " mas foi " + actual);
    }

    // ------------------------------------------------------------------ meio a meio

    @Test
    void halfAndHalfChargesTheMostExpensiveFlavorAndSplitsStock() {
        Item cheap = item(Category.PIZZA, "40.00", "10");
        Item dear = item(Category.PIZZA, "50.00", "10");

        OrderResponse created = orders.create(adminId(),
                order(PaymentMethod.PIX, cheap.productId(), 2, List.of(dear.productName())));

        assertMoney("50", created.items().get(0).unitPrice());
        assertMoney("100", created.total());
        assertEquals(List.of(dear.productName()), created.items().get(0).halfFlavors());
        // 2 pizzas meio a meio: 1 unidade da receita de cada sabor
        assertMoney("9", stock(cheap.ingredientId()));
        assertMoney("9", stock(dear.ingredientId()));
    }

    @Test
    void halfAndHalfIsRefusedForNonPizzas() {
        Item side = item(Category.SIDE, "10.00", "10");
        Item pizza = item(Category.PIZZA, "40.00", "10");

        assertThrows(BusinessException.class,
                () -> orders.create(adminId(), order(PaymentMethod.PIX, side.productId(), 1, List.of(pizza.productName()))));
    }

    @Test
    void halfAndHalfRefusesUnknownFlavor() {
        Item pizza = item(Category.PIZZA, "40.00", "10");

        assertThrows(BusinessException.class,
                () -> orders.create(adminId(), order(PaymentMethod.PIX, pizza.productId(), 1, List.of("Sabor-inexistente-" + suffix()))));
    }

    // ------------------------------------------------------------------ cancelamento

    private OrderResponse preparing(Item item) {
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.CASH, item.productId(), 1, null));
        orders.updateStatus(created.id(), OrderStatus.CONFIRMED, adminId());
        return orders.updateStatus(created.id(), OrderStatus.PREPARING, adminId());
    }

    @Test
    void cancelBeforePreparingReturnsStockByDefault() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.CASH, item.productId(), 1, null));
        assertMoney("4", stock(item.ingredientId()));

        OrderResponse cancelled = orders.updateStatus(created.id(), OrderStatus.CANCELLED, adminId());

        assertEquals(Boolean.TRUE, cancelled.stockReturned());
        assertMoney("5", stock(item.ingredientId()));
    }

    @Test
    void cancelWhilePreparingRequiresAReason() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse inKitchen = preparing(item);

        assertThrows(BusinessException.class,
                () -> orders.updateStatus(inKitchen.id(), OrderStatus.CANCELLED, adminId(), "  ", null));
        assertMoney("4", stock(item.ingredientId()));
    }

    @Test
    void cancelWhilePreparingIsALossByDefault() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse inKitchen = preparing(item);

        OrderResponse cancelled = orders.updateStatus(inKitchen.id(), OrderStatus.CANCELLED, adminId(),
                "Cliente desistiu", null);

        assertEquals(Boolean.FALSE, cancelled.stockReturned());
        assertEquals("Cliente desistiu", cancelled.cancelReason());
        assertMoney("4", stock(item.ingredientId()));
    }

    @Test
    void cancelWhilePreparingCanStillReturnStockWhenAsked() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse inKitchen = preparing(item);

        OrderResponse cancelled = orders.updateStatus(inKitchen.id(), OrderStatus.CANCELLED, adminId(),
                "Erro de digitação", true);

        assertEquals(Boolean.TRUE, cancelled.stockReturned());
        assertMoney("5", stock(item.ingredientId()));
    }

    // ------------------------------------------------------------------ pagamento

    @Test
    void cashPaymentComputesChangeAndCannotBePaidTwice() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.CASH, item.productId(), 1, null));
        assertFalse(created.paid());

        OrderResponse paid = orders.registerPayment(created.id(), new BigDecimal("20"), adminId());

        assertTrue(paid.paid());
        assertMoney("20", paid.amountReceived());
        assertMoney("10", paid.change());
        assertThrows(BusinessException.class, () -> orders.registerPayment(created.id(), null, adminId()));
    }

    @Test
    void cashPaymentBelowTotalIsRefused() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.CASH, item.productId(), 1, null));

        assertThrows(BusinessException.class,
                () -> orders.registerPayment(created.id(), new BigDecimal("5"), adminId()));
    }

    @Test
    void cancelledOrdersCannotBePaid() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.PIX, item.productId(), 1, null));
        orders.updateStatus(created.id(), OrderStatus.CANCELLED, adminId());

        assertThrows(BusinessException.class, () -> orders.registerPayment(created.id(), null, adminId()));
    }

    @Test
    void cashClosingCountsReceivedPaymentsByMethod() {
        Item item = item(Category.SIDE, "10.00", "5");
        OrderResponse created = orders.create(adminId(), order(PaymentMethod.PIX, item.productId(), 1, null));
        orders.registerPayment(created.id(), null, adminId());

        var closing = orders.cashClosing(null);

        assertTrue(closing.byMethod().stream().anyMatch(m -> m.method() == PaymentMethod.PIX && m.count() >= 1));
        assertTrue(closing.totalReceived().compareTo(new BigDecimal("10")) >= 0);
    }
}
