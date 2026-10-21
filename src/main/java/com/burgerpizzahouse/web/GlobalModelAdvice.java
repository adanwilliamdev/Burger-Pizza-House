package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.domain.ProductType;
import com.burgerpizzahouse.domain.Role;
import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/** Listas de opções (enums) disponíveis em todos os templates. */
@ControllerAdvice(basePackages = "com.burgerpizzahouse.web")
public class GlobalModelAdvice {

    @ModelAttribute("categories")
    List<Category> categories() {
        return Arrays.asList(Category.values());
    }

    @ModelAttribute("productTypes")
    List<ProductType> productTypes() {
        return Arrays.asList(ProductType.values());
    }

    @ModelAttribute("orderTypes")
    List<OrderType> orderTypes() {
        return Arrays.asList(OrderType.values());
    }

    @ModelAttribute("orderStatuses")
    List<OrderStatus> orderStatuses() {
        return Arrays.asList(OrderStatus.values());
    }

    @ModelAttribute("paymentMethods")
    List<PaymentMethod> paymentMethods() {
        return Arrays.asList(PaymentMethod.values());
    }

    @ModelAttribute("roles")
    List<Role> roles() {
        return Arrays.asList(Role.values());
    }
}
