package com.burgerpizzahouse.api;

import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.dto.OrderDtos.CashClosingResponse;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.dto.OrderDtos.PaymentRequest;
import com.burgerpizzahouse.dto.OrderDtos.StatusUpdateRequest;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.OrderService;
import com.burgerpizzahouse.service.OrderService.OrderFilter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    /** Exposto também no CORS (veja SecurityConfig), para navegadores em outra origem poderem lê-lo. */
    public static final String TOTAL_COUNT_HEADER = "X-Total-Count";

    private final OrderService orders;

    public OrderApiController(OrderService orders) {
        this.orders = orders;
    }

    /**
     * Lista paginada por offset/limit. O corpo continua sendo um array (compatível com quem já consome); o total de
     * pedidos que casam com os filtros vem no cabeçalho {@value #TOTAL_COUNT_HEADER}.
     */
    @GetMapping
    public ResponseEntity<List<OrderResponse>> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderType type,
            @RequestParam(name = "start_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,
            @RequestParam(name = "end_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate,
            @RequestParam(name = "q", required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "500") @Min(1) @Max(500) int limit,
            @RequestParam(defaultValue = "0") @Min(0) int offset) {
        Page<OrderResponse> page = orders.list(new OrderFilter(status, type, startDate, endDate, query), limit, offset);
        return ResponseEntity.ok()
                .header(TOTAL_COUNT_HEADER, String.valueOf(page.getTotalElements()))
                .body(page.getContent());
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
        return orders.updateStatus(id, request.status(), user.getId(), request.cancelReason(), request.returnToStock());
    }

    /** Registra o pagamento (em dinheiro, o valor recebido é opcional e gera o troco). Corpo opcional. */
    @PostMapping("/{id}/payment")
    public OrderResponse pay(@PathVariable Long id, @Valid @RequestBody(required = false) PaymentRequest request,
                             @AuthenticationPrincipal AppUserDetails user) {
        return orders.registerPayment(id, request == null ? null : request.amountReceived(), user.getId());
    }

    /** Fechamento de caixa do dia (padrão: hoje no fuso do negócio). ADMIN e MANAGER. */
    @GetMapping("/cash-closing")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public CashClosingResponse cashClosing(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return orders.cashClosing(date);
    }
}
