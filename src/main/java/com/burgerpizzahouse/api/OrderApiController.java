package com.burgerpizzahouse.api;

import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.dto.OrderDtos.StatusUpdateRequest;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.OrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "orders")
@Validated
public class OrderApiController {

    private final OrderService orders;

    public OrderApiController(OrderService orders) {
        this.orders = orders;
    }

    @GetMapping
    public List<OrderResponse> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderType type,
            @RequestParam(name = "start_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,
            @RequestParam(name = "end_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate,
            @RequestParam(defaultValue = "500") @Min(1) @Max(500) int limit,
            @RequestParam(defaultValue = "0") @Min(0) int offset) {
        return orders.list(status, type, startDate, endDate, limit, offset);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody OrderCreateRequest request,
                                @AuthenticationPrincipal AppUserDetails user) {
        return orders.create(user.getId(), request);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return orders.get(id);
    }

    @PostMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request,
                                      @AuthenticationPrincipal AppUserDetails user) {
        return orders.updateStatus(id, request.status(), user.getId());
    }
}
