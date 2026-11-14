package com.burgerpizzahouse.dto;

import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** DTOs de pedidos. Os nomes JSON saem em snake_case. */
public final class OrderDtos {

    private OrderDtos() {
    }

    public record OrderItemRequest(
            @NotNull(message = "Informe o produto do item.") Long productId,
            @NotNull @Min(value = 1, message = "A quantidade do item deve ser ao menos 1.") Integer quantity,
            String notes,
            /** Meio a meio / quartos: nomes dos OUTROS sabores (até 3) além do produto do item; só pizzas. */
            List<String> halfFlavors) {
    }

    public record OrderCreateRequest(
            String customerName,
            String customerPhone,
            String customerAddress,
            OrderType type,
            PaymentMethod paymentMethod,
            @NotNull(message = "O pedido precisa ter ao menos um item") @Valid List<OrderItemRequest> items,
            @DecimalMin(value = "0", message = "O desconto não pode ser negativo.") BigDecimal discount,
            @DecimalMin(value = "0", message = "A taxa de entrega não pode ser negativa.") BigDecimal deliveryFee,
            String note) {
    }

    /**
     * Mudança de status. Ao cancelar um pedido que já estava em preparo (ou depois), informe {@code cancelReason};
     * {@code returnToStock} decide se os insumos voltam ao estoque (padrão: só se o pedido ainda não estava em
     * preparo) ou se são registrados como perda.
     */
    public record StatusUpdateRequest(
            @NotNull(message = "Informe o novo status.") OrderStatus status,
            String cancelReason,
            Boolean returnToStock) {
    }

    public record PaymentRequest(
            @DecimalMin(value = "0", message = "O valor recebido não pode ser negativo.") BigDecimal amountReceived) {
    }

    public record MethodTotal(PaymentMethod method, int count, BigDecimal amount) {
    }

    /** Fechamento de caixa de um dia: recebido por forma de pagamento, a receber e cancelamentos. */
    public record CashClosingResponse(
            java.time.LocalDate date,
            List<MethodTotal> byMethod,
            BigDecimal totalReceived,
            BigDecimal totalReceivable,
            int receivableCount,
            int cancelledCount) {
    }

    public record OrderItemResponse(
            Long id,
            Long productId,
            String productName,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            String notes,
            List<String> halfFlavors) {
    }

    public record OrderUserResponse(Long id, String name, String email) {
    }

    public record OrderResponse(
            Long id,
            int number,
            OrderUserResponse user,
            String customerName,
            String customerPhone,
            String customerAddress,
            OrderType type,
            OrderStatus status,
            PaymentMethod paymentMethod,
            BigDecimal total,
            BigDecimal discount,
            BigDecimal deliveryFee,
            BigDecimal subtotal,
            String note,
            Instant createdAt,
            Instant updatedAt,
            List<OrderItemResponse> items,
            List<OrderStatus> allowedNextStatuses,
            boolean paid,
            Instant paidAt,
            BigDecimal amountReceived,
            BigDecimal change,
            String cancelReason,
            Boolean stockReturned) {
    }

    public record StockShortage(Long ingredientId, String ingredientName, BigDecimal required, BigDecimal available) {
    }
}
