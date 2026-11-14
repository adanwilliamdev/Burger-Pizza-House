package com.burgerpizzahouse.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Cálculo puro (sem banco, sem Spring) de consumo e falta de ingredientes.
 * Isolado para ser testado com testes unitários simples.
 */
public final class StockCalculator {

    /** Casas decimais mantidas nas quantidades agregadas. */
    public static final int SCALE = 4;

    private StockCalculator() {
    }

    /** Linha do pedido: produto e quantidade. */
    public record Line(long productId, int quantity) {
    }

    /**
     * Consumo fracionado: {@code units} unidades (possivelmente fracionárias) da receita do produto. Usado no meio a
     * meio: cada sabor consome {@code quantidade / nº de sabores} da própria receita.
     */
    public record UnitLine(long productId, BigDecimal units) {
    }

    /** Linha de receita: quanto de um ingrediente é gasto por unidade de produto. */
    public record RecipeEntry(long ingredientId, BigDecimal quantityPerUnit) {
    }

    public record Shortage(long ingredientId, String ingredientName, BigDecimal required, BigDecimal available) {
    }

    /**
     * Soma o consumo por ingrediente entre linhas e produtos diferentes.
     *
     * @param lines   (produto, quantidade) de cada linha do pedido
     * @param recipes produto -> receita
     * @return ingrediente -> total necessário, em ordem crescente de id
     */
    public static Map<Long, BigDecimal> aggregateRequired(List<Line> lines, Map<Long, List<RecipeEntry>> recipes) {
        return aggregateRequiredUnits(lines.stream()
                .map(l -> new UnitLine(l.productId(), BigDecimal.valueOf(l.quantity())))
                .toList(), recipes);
    }

    /** Igual a {@link #aggregateRequired}, mas aceitando unidades fracionárias (meio a meio). */
    public static Map<Long, BigDecimal> aggregateRequiredUnits(List<UnitLine> lines,
                                                               Map<Long, List<RecipeEntry>> recipes) {
        Map<Long, BigDecimal> required = new TreeMap<>();
        for (UnitLine line : lines) {
            for (RecipeEntry entry : recipes.getOrDefault(line.productId(), List.of())) {
                BigDecimal amount = entry.quantityPerUnit().multiply(line.units());
                required.merge(entry.ingredientId(), amount, BigDecimal::add);
            }
        }
        required.replaceAll((id, value) -> value.setScale(SCALE, RoundingMode.HALF_UP));
        return required;
    }

    /** Lista os ingredientes cujo saldo não cobre o necessário. Ingrediente desconhecido = saldo zero. */
    public static List<Shortage> findShortages(Map<Long, BigDecimal> required,
                                               Map<Long, BigDecimal> available,
                                               Map<Long, String> names) {
        List<Shortage> shortages = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> e : new TreeMap<>(required).entrySet()) {
            BigDecimal have = available.getOrDefault(e.getKey(), BigDecimal.ZERO);
            BigDecimal need = e.getValue();
            if (have.compareTo(need) < 0) {
                shortages.add(new Shortage(e.getKey(), names.getOrDefault(e.getKey(), String.valueOf(e.getKey())),
                        need, have));
            }
        }
        return shortages;
    }
}
