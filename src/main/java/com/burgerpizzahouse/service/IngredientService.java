package com.burgerpizzahouse.service;

import com.burgerpizzahouse.domain.AuditLog;
import com.burgerpizzahouse.domain.Ingredient;
import com.burgerpizzahouse.domain.StockMovement;
import com.burgerpizzahouse.domain.StockReason;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientRequest;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import com.burgerpizzahouse.dto.CatalogDtos.StockAdjustRequest;
import com.burgerpizzahouse.repository.AuditLogRepository;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.ProductIngredientRepository;
import com.burgerpizzahouse.repository.StockMovementRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IngredientService {

    private final IngredientRepository ingredients;
    private final ProductIngredientRepository recipeLines;
    private final StockMovementRepository movements;
    private final AuditLogRepository audits;
    private final ApplicationEventPublisher events;

    public IngredientService(IngredientRepository ingredients, ProductIngredientRepository recipeLines,
                             StockMovementRepository movements, AuditLogRepository audits,
                             ApplicationEventPublisher events) {
        this.ingredients = ingredients;
        this.recipeLines = recipeLines;
        this.movements = movements;
        this.audits = audits;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<IngredientResponse> list(boolean lowStockOnly) {
        List<Ingredient> found = lowStockOnly ? ingredients.findLowStock() : ingredients.findAllByOrderByNameAsc();
        return found.stream().map(Mappers::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public IngredientResponse get(Long id) {
        return Mappers.toResponse(find(id));
    }

    @Transactional
    public IngredientResponse create(IngredientRequest request) {
        Ingredient ingredient = new Ingredient(request.name().strip(), unitOf(request.unit()),
                nonNegative(request.currentStock()), nonNegative(request.minStock()), request.costPerUnit());
        ingredients.save(ingredient);
        events.publishEvent(new DashboardChangedEvent());
        return Mappers.toResponse(ingredient);
    }

    @Transactional
    public IngredientResponse update(Long id, IngredientRequest request) {
        Ingredient ingredient = find(id);
        ingredient.setName(request.name().strip());
        ingredient.setUnit(unitOf(request.unit()));
        ingredient.setCurrentStock(nonNegative(request.currentStock()));
        ingredient.setMinStock(nonNegative(request.minStock()));
        ingredient.setCostPerUnit(request.costPerUnit());
        ingredients.saveAndFlush(ingredient);
        events.publishEvent(new DashboardChangedEvent());
        return Mappers.toResponse(ingredient);
    }

    /** Ajuste manual de estoque, com lock da linha (não pode se sobrepor a uma baixa de pedido em andamento). */
    @Transactional
    public IngredientResponse adjustStock(Long id, StockAdjustRequest request, Long adminId) {
        Ingredient ingredient = ingredients.findByIdForUpdate(id)
                .orElseThrow(() -> BusinessException.notFound("Ingrediente não encontrado."));

        boolean add = "add".equals(request.operation());
        BigDecimal quantity = request.quantity();
        if (!add && ingredient.getCurrentStock().compareTo(quantity) < 0) {
            throw new BusinessException("Quantidade a remover (" + plain(quantity)
                    + ") é maior que o estoque atual (" + plain(ingredient.getCurrentStock()) + ").");
        }

        BigDecimal delta = add ? quantity : quantity.negate();
        ingredient.setCurrentStock(ingredient.getCurrentStock().add(delta));
        movements.save(new StockMovement(ingredient.getId(), null, adminId, delta,
                add ? StockReason.MANUAL_ADD : StockReason.MANUAL_REMOVE));
        audits.save(new AuditLog(adminId, "ADJUST_STOCK", "Ingredient", String.valueOf(ingredient.getId()),
                ingredient.getName() + ": " + (add ? "+" : "-") + plain(quantity) + " " + ingredient.getUnit()));
        ingredients.saveAndFlush(ingredient);
        events.publishEvent(new DashboardChangedEvent()); // contagem de "estoque baixo" mudou
        return Mappers.toResponse(ingredient);
    }

    @Transactional
    public void delete(Long id) {
        Ingredient ingredient = find(id);
        long usage = recipeLines.countByIngredientId(id);
        if (usage > 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "Este ingrediente é usado em " + usage
                    + " receita(s) de produto e não pode ser excluído. Remova-o das receitas primeiro.");
        }
        ingredients.delete(ingredient);
        events.publishEvent(new DashboardChangedEvent());
    }

    private Ingredient find(Long id) {
        return ingredients.findById(id).orElseThrow(() -> BusinessException.notFound("Ingrediente não encontrado."));
    }

    private static String unitOf(String unit) {
        return unit == null || unit.isBlank() ? "g" : unit.strip();
    }

    private static BigDecimal nonNegative(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
