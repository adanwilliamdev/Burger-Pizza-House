package com.burgerpizzahouse.service;

import com.burgerpizzahouse.domain.Ingredient;
import com.burgerpizzahouse.domain.Order;
import com.burgerpizzahouse.domain.OrderItem;
import com.burgerpizzahouse.domain.Product;
import com.burgerpizzahouse.domain.ProductIngredient;
import com.burgerpizzahouse.domain.User;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.dto.CatalogDtos.RecipeLineResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderUserResponse;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import java.util.List;

/**
 * Conversão entidade -> DTO. Deve ser chamada dentro de uma transação (as associações são lazy).
 */
public final class Mappers {

    private Mappers() {
    }

    public static UserResponse toResponse(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(),
                u.getCreatedAt(), u.getUpdatedAt());
    }

    public static IngredientResponse toResponse(Ingredient i) {
        return new IngredientResponse(i.getId(), i.getName(), i.getUnit(), i.getCurrentStock(), i.getMinStock(),
                i.getCostPerUnit(), i.getCreatedAt(), i.getUpdatedAt(), i.isLowStock());
    }

    public static ProductResponse toResponse(Product p) {
        List<RecipeLineResponse> lines = p.getIngredients().stream()
                .map(Mappers::toLine)
                .toList();
        return new ProductResponse(p.getId(), p.getName(), p.getDescription(), p.getPrice(), p.getCost(),
                p.getCategory(), p.getType(), p.isActive(), p.getImage(), p.getPreparationTime(),
                p.getCreatedAt(), p.getUpdatedAt(), lines);
    }

    private static RecipeLineResponse toLine(ProductIngredient pi) {
        return new RecipeLineResponse(pi.getId(), pi.getIngredient().getId(), pi.getIngredient().getName(),
                pi.getQuantity(), pi.getUnit());
    }

    public static OrderResponse toResponse(Order o) {
        List<OrderItemResponse> items = o.getItems().stream().map(Mappers::toItem).toList();
        User u = o.getUser();
        return new OrderResponse(o.getId(), o.getNumber(),
                new OrderUserResponse(u.getId(), u.getName(), u.getEmail()),
                o.getCustomerName(), o.getCustomerPhone(), o.getCustomerAddress(),
                o.getType(), o.getStatus(), o.getPaymentMethod(),
                o.getTotal(), o.getDiscount(), o.getDeliveryFee(), o.subtotal(), o.getNote(),
                o.getCreatedAt(), o.getUpdatedAt(), items, o.allowedNextStatuses());
    }

    private static OrderItemResponse toItem(OrderItem item) {
        return new OrderItemResponse(item.getId(), item.getProduct().getId(), item.getProduct().getName(),
                item.getQuantity(), item.getUnitPrice(), item.getTotalPrice(), item.getNotes(),
                List.copyOf(item.getHalfFlavors()));
    }
}
