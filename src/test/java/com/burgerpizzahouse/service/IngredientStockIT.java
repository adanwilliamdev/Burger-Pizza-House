package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.dto.CatalogDtos.IngredientRequest;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import com.burgerpizzahouse.repository.StockMovementRepository;
import com.burgerpizzahouse.repository.UserRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;

/** Edição e exclusão de ingredientes: o saldo e o livro-razão (stock_movements) precisam continuar batendo. */
@SpringBootTest
class IngredientStockIT {

    @Autowired
    IngredientService ingredients;
    @Autowired
    StockMovementRepository movements;
    @Autowired
    UserRepository users;

    private Long adminId() {
        return users.findByEmailIgnoreCase(SeedService.ADMIN_EMAIL).orElseThrow().getId();
    }

    private IngredientResponse create(String stock) {
        return ingredients.create(new IngredientRequest("Estoque-" + UUID.randomUUID().toString().substring(0, 6),
                "un", new BigDecimal(stock), BigDecimal.ZERO, BigDecimal.ONE));
    }

    private IngredientRequest edit(IngredientResponse base, BigDecimal stock) {
        return new IngredientRequest(base.name(), base.unit(), stock, base.minStock(), base.costPerUnit());
    }

    private static void assertStock(String expected, IngredientResponse actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual.currentStock()),
                "estoque esperado " + expected + " mas foi " + actual.currentStock());
    }

    @Test
    void updateWithoutBalanceKeepsStockAndWritesNoMovement() {
        IngredientResponse ing = create("10");
        IngredientResponse updated = ingredients.update(ing.id(), edit(ing, null), adminId());
        assertStock("10", updated);
        assertEquals(0, movements.countByIngredientId(ing.id()));
    }

    @Test
    void updateWithNewBalanceRegistersTheDifferenceInTheLedger() {
        IngredientResponse ing = create("10");
        assertStock("4", ingredients.update(ing.id(), edit(ing, new BigDecimal("4")), adminId()));
        assertEquals(1, movements.countByIngredientId(ing.id()));
        assertStock("9", ingredients.update(ing.id(), edit(ing, new BigDecimal("9")), adminId()));
        assertEquals(2, movements.countByIngredientId(ing.id()));
    }

    @Test
    void updateWithSameBalanceWritesNoMovement() {
        IngredientResponse ing = create("10");
        ingredients.update(ing.id(), edit(ing, new BigDecimal("10")), adminId());
        assertEquals(0, movements.countByIngredientId(ing.id()));
    }

    @Test
    void negativeBalanceIsRejected() {
        IngredientResponse ing = create("10");
        assertThrows(BusinessException.class,
                () -> ingredients.update(ing.id(), edit(ing, new BigDecimal("-1")), adminId()));
        assertStock("10", ingredients.get(ing.id()));
    }

    @Test
    void ingredientWithHistoryCannotBeDeleted() {
        IngredientResponse ing = create("10");
        ingredients.update(ing.id(), edit(ing, new BigDecimal("3")), adminId());
        BusinessException e = assertThrows(BusinessException.class, () -> ingredients.delete(ing.id()));
        assertEquals(HttpStatus.CONFLICT, e.getStatus());
        assertTrue(e.getMessage().contains("histórico"));
        assertStock("3", ingredients.get(ing.id()));
    }

    @Test
    void ingredientWithoutHistoryCanBeDeleted() {
        IngredientResponse ing = create("10");
        ingredients.delete(ing.id());
        assertThrows(BusinessException.class, () -> ingredients.get(ing.id()));
    }
}
