package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.service.StockCalculator.Line;
import com.burgerpizzahouse.service.StockCalculator.RecipeEntry;
import com.burgerpizzahouse.service.StockCalculator.Shortage;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Testes unitários do cálculo de estoque — sem banco e sem Spring. */
class StockCalculatorTest {

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    @Test
    void sumsSameIngredientAcrossProductsAndLines() {
        Map<Long, List<RecipeEntry>> recipes = Map.of(
                1L, List.of(new RecipeEntry(10, bd("0.3")), new RecipeEntry(11, bd("0.2"))),
                2L, List.of(new RecipeEntry(10, bd("0.1"))));
        // 3 do produto 1 no total (2 + 1) e 3 do produto 2
        List<Line> lines = List.of(new Line(1, 2), new Line(2, 3), new Line(1, 1));

        Map<Long, BigDecimal> required = StockCalculator.aggregateRequired(lines, recipes);

        assertEquals(0, required.get(10L).compareTo(bd("1.2")));
        assertEquals(0, required.get(11L).compareTo(bd("0.6")));
    }

    @Test
    void decimalQuantitiesHaveNoFloatingPointNoise() {
        Map<Long, BigDecimal> required = StockCalculator.aggregateRequired(
                List.of(new Line(1, 3)), Map.of(1L, List.of(new RecipeEntry(10, bd("0.1")))));
        assertEquals(0, required.get(10L).compareTo(bd("0.3")));
    }

    @Test
    void productWithoutRecipeConsumesNothing() {
        assertTrue(StockCalculator.aggregateRequired(List.of(new Line(99, 5)), Map.of()).isEmpty());
    }

    @Test
    void reportsOnlyMissingIngredients() {
        List<Shortage> shortages = StockCalculator.findShortages(
                Map.of(1L, bd("5"), 2L, bd("1")),
                Map.of(1L, bd("4"), 2L, bd("1")),
                Map.of(1L, "Queijo", 2L, "Farinha"));

        assertEquals(1, shortages.size());
        assertEquals("Queijo", shortages.get(0).ingredientName());
        assertEquals(0, shortages.get(0).required().compareTo(bd("5")));
        assertEquals(0, shortages.get(0).available().compareTo(bd("4")));
    }

    @Test
    void exactStockIsEnough() {
        BigDecimal three = bd("0.1").multiply(bd("3"));
        assertTrue(StockCalculator.findShortages(Map.of(1L, bd("0.3")), Map.of(1L, three), Map.of(1L, "x")).isEmpty());
    }

    @Test
    void unknownIngredientCountsAsZeroStock() {
        List<Shortage> shortages = StockCalculator.findShortages(Map.of(7L, bd("1")), Map.of(), Map.of());
        assertEquals(1, shortages.size());
        assertEquals(0, shortages.get(0).available().signum());
    }
}
