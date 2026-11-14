package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.AuditLog;
import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.Ingredient;
import com.burgerpizzahouse.domain.Order;
import com.burgerpizzahouse.domain.OrderItem;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.domain.OrderType;
import com.burgerpizzahouse.domain.PaymentMethod;
import com.burgerpizzahouse.domain.Product;
import com.burgerpizzahouse.domain.ProductIngredient;
import com.burgerpizzahouse.domain.StockMovement;
import com.burgerpizzahouse.domain.StockReason;
import com.burgerpizzahouse.dto.OrderDtos.CashClosingResponse;
import com.burgerpizzahouse.dto.OrderDtos.MethodTotal;
import com.burgerpizzahouse.dto.OrderDtos.OrderCreateRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderItemRequest;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.dto.OrderDtos.StockShortage;
import com.burgerpizzahouse.repository.AuditLogRepository;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.OrderRepository;
import com.burgerpizzahouse.repository.ProductIngredientRepository;
import com.burgerpizzahouse.repository.ProductRepository;
import com.burgerpizzahouse.repository.StockMovementRepository;
import com.burgerpizzahouse.repository.UserRepository;
import com.burgerpizzahouse.service.StockCalculator.RecipeEntry;
import com.burgerpizzahouse.service.StockCalculator.Shortage;
import com.burgerpizzahouse.service.StockCalculator.UnitLine;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de negócio de pedidos.
 *
 * <p>Garantias:
 * <ul>
 *   <li>Estoque nunca é vendido além do saldo, mesmo com pedidos simultâneos: as linhas de
 *       {@code ingredients} são travadas (SELECT ... FOR UPDATE, sempre em ordem de id para evitar
 *       deadlock) ANTES de validar o saldo.</li>
 *   <li>Número do pedido sequencial e sem repetição (advisory lock da transação + índice único).</li>
 *   <li>Cancelar um pedido devolve ao estoque exatamente o que ele consumiu (livro-razão
 *       {@code stock_movements}), uma única vez.</li>
 *   <li>Tudo (pedido, itens, baixa, movimentos, auditoria) numa única transação.</li>
 * </ul>
 */
@Service
public class OrderService {

    /** Chave arbitrária (constante) do advisory lock que serializa a geração do número do pedido. */
    private static final String ORDER_NUMBER_LOCK_SQL = "select pg_advisory_xact_lock(726001)";

    private final OrderRepository orders;
    private final ProductRepository products;
    private final ProductIngredientRepository recipeLines;
    private final IngredientRepository ingredients;
    private final StockMovementRepository movements;
    private final AuditLogRepository audits;
    private final UserRepository users;
    private final JdbcTemplate jdbc;
    private final ApplicationEventPublisher events;
    private final AppProperties props;

    public OrderService(OrderRepository orders, ProductRepository products, ProductIngredientRepository recipeLines,
                        IngredientRepository ingredients, StockMovementRepository movements,
                        AuditLogRepository audits, UserRepository users, JdbcTemplate jdbc,
                        ApplicationEventPublisher events, AppProperties props) {
        this.orders = orders;
        this.products = products;
        this.recipeLines = recipeLines;
        this.ingredients = ingredients;
        this.movements = movements;
        this.audits = audits;
        this.users = users;
        this.jdbc = jdbc;
        this.events = events;
        this.props = props;
    }

    // ------------------------------------------------------------------ consulta

    @Transactional(readOnly = true)
    public List<OrderResponse> list(OrderStatus status, OrderType type, LocalDate startDate, LocalDate endDate,
                                    int limit, int offset) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<java.time.Instant>get("createdAt"),
                        startDate.atStartOfDay(props.zone()).toInstant()));
            }
            if (endDate != null) {
                predicates.add(cb.lessThan(root.<java.time.Instant>get("createdAt"),
                        endDate.plusDays(1).atStartOfDay(props.zone()).toInstant()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Sort sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        return orders.findAll(spec, new OffsetBasedPageRequest(offset, limit, sort)).getContent().stream()
                .map(Mappers::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        Order order = orders.findWithUserById(id)
                .orElseThrow(() -> BusinessException.notFound("Pedido não encontrado."));
        return Mappers.toResponse(order);
    }

    // ------------------------------------------------------------------- criação

    @Transactional
    public OrderResponse create(Long userId, OrderCreateRequest data) {
        if (data.items() == null || data.items().isEmpty()) {
            throw new BusinessException("O pedido precisa ter ao menos um item");
        }

        // --- produtos: 1 query para todos os itens
        Set<Long> productIds = new LinkedHashSet<>();
        for (OrderItemRequest item : data.items()) {
            productIds.add(item.productId());
        }
        Map<Long, Product> byId = new HashMap<>();
        for (Product p : products.findAllById(productIds)) {
            byId.put(p.getId(), p);
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> items = new ArrayList<>();
        // consumo de estoque por produto (fracionado no meio a meio) e produtos cujas receitas serão lidas
        List<UnitLine> unitLines = new ArrayList<>();
        Set<Long> recipeProductIds = new LinkedHashSet<>(productIds);
        for (OrderItemRequest item : data.items()) {
            Product product = byId.get(item.productId());
            if (product == null) {
                throw BusinessException.notFound("Produto não encontrado");
            }
            if (!product.isActive()) {
                throw new BusinessException("Produto \"" + product.getName() + "\" não está mais disponível");
            }
            List<Product> otherFlavors = resolveFlavors(product, item.halfFlavors());

            // Meio a meio: o preço é o do sabor mais caro (regra comum em pizzarias).
            BigDecimal unitPrice = product.getPrice();
            for (Product flavor : otherFlavors) {
                unitPrice = unitPrice.max(flavor.getPrice());
            }
            BigDecimal totalPrice = Money.round(unitPrice.multiply(BigDecimal.valueOf(item.quantity())));
            subtotal = Money.round(subtotal.add(totalPrice));
            items.add(new OrderItem(product, item.quantity(), unitPrice, totalPrice,
                    blankToNull(item.notes()), otherFlavors.stream().map(Product::getName).toList()));

            // Estoque: cada sabor consome (quantidade / nº de sabores) da própria receita.
            BigDecimal share = BigDecimal.valueOf(item.quantity());
            if (!otherFlavors.isEmpty()) {
                share = share.divide(BigDecimal.valueOf(otherFlavors.size() + 1L), 6, RoundingMode.HALF_UP);
            }
            unitLines.add(new UnitLine(product.getId(), share));
            for (Product flavor : otherFlavors) {
                unitLines.add(new UnitLine(flavor.getId(), share));
                recipeProductIds.add(flavor.getId());
            }
        }

        BigDecimal discount = Money.round(Money.orZero(data.discount()));
        BigDecimal deliveryFee = Money.round(Money.orZero(data.deliveryFee()));
        if (discount.compareTo(subtotal) > 0) {
            throw new BusinessException("O desconto não pode ser maior que o subtotal do pedido");
        }
        BigDecimal total = Money.round(subtotal.subtract(discount).add(deliveryFee));

        // --- estoque: soma por ingrediente, trava as linhas e só então valida
        Map<Long, List<RecipeEntry>> recipes = new HashMap<>();
        for (ProductIngredient pi : recipeLines.findByProductIds(recipeProductIds)) {
            recipes.computeIfAbsent(pi.getProduct().getId(), k -> new ArrayList<>())
                    .add(new RecipeEntry(pi.getIngredient().getId(), pi.getQuantity()));
        }
        Map<Long, BigDecimal> required = StockCalculator.aggregateRequiredUnits(unitLines, recipes);

        Map<Long, Ingredient> locked = lockIngredients(required.keySet());
        Map<Long, BigDecimal> available = new HashMap<>();
        Map<Long, String> names = new HashMap<>();
        locked.forEach((id, ing) -> {
            available.put(id, ing.getCurrentStock());
            names.put(id, ing.getName());
        });
        List<Shortage> shortages = StockCalculator.findShortages(required, available, names);
        if (!shortages.isEmpty()) {
            // a exceção derruba a transação: o rollback libera os locks imediatamente
            throw new InsufficientStockException(shortages.stream()
                    .map(s -> new StockShortage(s.ingredientId(), s.ingredientName(), s.required(), s.available()))
                    .toList());
        }

        // --- número sequencial: o advisory lock vale até o commit/rollback
        jdbc.execute(ORDER_NUMBER_LOCK_SQL);
        Integer last = orders.findMaxNumber();
        int number = (last == null ? 0 : last) + 1;

        Order order = new Order(number, users.getReferenceById(userId));
        order.setCustomerName(blankToNull(data.customerName()));
        order.setCustomerPhone(blankToNull(data.customerPhone()));
        order.setCustomerAddress(blankToNull(data.customerAddress()));
        order.setType(data.type() == null ? OrderType.DELIVERY : data.type());
        order.setPaymentMethod(data.paymentMethod() == null ? PaymentMethod.CASH : data.paymentMethod());
        order.setStatus(OrderStatus.PENDING);
        order.setTotal(total);
        order.setDiscount(discount);
        order.setDeliveryFee(deliveryFee);
        order.setNote(blankToNull(data.note()));
        items.forEach(order::addItem);
        orders.save(order);

        for (Map.Entry<Long, BigDecimal> entry : required.entrySet()) {
            Ingredient ingredient = locked.get(entry.getKey());
            ingredient.setCurrentStock(ingredient.getCurrentStock().subtract(entry.getValue()));
            movements.save(new StockMovement(ingredient.getId(), order.getId(), userId,
                    entry.getValue().negate(), StockReason.ORDER));
        }

        audits.save(new AuditLog(userId, "CREATE_ORDER", "Order", String.valueOf(order.getId()),
                "Pedido #" + number + " criado — total " + total.toPlainString()));
        events.publishEvent(new DashboardChangedEvent());
        return Mappers.toResponse(order);
    }

    // ------------------------------------------------------------ mudança de status

    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus newStatus, Long userId) {
        return updateStatus(orderId, newStatus, userId, null, null);
    }

    /**
     * Muda o status. No cancelamento, {@code cancelReason} é obrigatório se o pedido já estava em preparo (ou
     * depois) e {@code returnToStock} decide o destino dos insumos: {@code true} devolve ao estoque; {@code false}
     * registra como perda (o estoque não é alterado). Se omitido, devolve apenas quando o pedido ainda não estava
     * em preparo.
     */
    @Transactional
    public OrderResponse updateStatus(Long orderId, OrderStatus newStatus, Long userId,
                                      String cancelReason, Boolean returnToStock) {
        // Relê o pedido com lock: dois "cancelar" simultâneos não podem devolver o estoque duas vezes.
        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> BusinessException.notFound("Pedido não encontrado."));
        OrderStatus oldStatus = order.getStatus();

        if (!oldStatus.canTransitionTo(newStatus)) {
            throw BusinessException.conflict("Não é possível mudar o status de \"" + oldStatus.getLabel()
                    + "\" para \"" + newStatus.getLabel() + "\"");
        }

        String auditDetails = "Status alterado de " + oldStatus.name() + " para " + newStatus.name();
        order.setStatus(newStatus);
        if (newStatus == OrderStatus.CANCELLED) {
            String reason = blankToNull(cancelReason);
            boolean prepared = oldStatus.isPreparedOrLater();
            if (prepared && reason == null) {
                throw new BusinessException("Informe o motivo do cancelamento de um pedido que já estava em preparo.");
            }
            boolean giveBack = returnToStock != null ? returnToStock : !prepared;
            order.setCancelReason(reason);
            order.setStockReturned(giveBack);
            if (giveBack) {
                restoreStock(order, userId);
            }
            auditDetails += giveBack ? " (insumos devolvidos ao estoque)" : " (perda: insumos NÃO devolvidos)";
            if (reason != null) {
                auditDetails += " — motivo: " + reason;
            }
        }

        orders.saveAndFlush(order);
        audits.save(new AuditLog(userId, "UPDATE_ORDER_STATUS", "Order", String.valueOf(order.getId()), auditDetails));
        events.publishEvent(new DashboardChangedEvent());
        return Mappers.toResponse(order);
    }

    // ------------------------------------------------------------------- pagamento

    /**
     * Registra o pagamento. Em dinheiro, {@code amountReceived} (opcional; padrão = total) gera o troco; nas demais
     * formas o valor recebido é o próprio total.
     */
    @Transactional
    public OrderResponse registerPayment(Long orderId, BigDecimal amountReceived, Long userId) {
        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> BusinessException.notFound("Pedido não encontrado."));
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw BusinessException.conflict("Pedido cancelado não pode ser pago.");
        }
        if (order.isPaid()) {
            throw BusinessException.conflict("Este pedido já foi pago.");
        }
        BigDecimal received = order.getTotal();
        if (order.getPaymentMethod() == PaymentMethod.CASH && amountReceived != null) {
            received = Money.round(amountReceived);
            if (received.compareTo(order.getTotal()) < 0) {
                throw new BusinessException("O valor recebido é menor que o total do pedido.");
            }
        }
        order.markPaid(received, Instant.now());
        orders.saveAndFlush(order);
        audits.save(new AuditLog(userId, "REGISTER_PAYMENT", "Order", String.valueOf(order.getId()),
                "Pagamento (" + order.getPaymentMethod().name() + ") registrado — recebido " + received.toPlainString()
                        + ", troco " + order.change().toPlainString()));
        return Mappers.toResponse(order);
    }

    /** Fechamento de caixa do dia (fuso do negócio): recebido por forma de pagamento, a receber e cancelados. */
    @Transactional(readOnly = true)
    public CashClosingResponse cashClosing(LocalDate date) {
        LocalDate day = date == null ? LocalDate.now(props.zone()) : date;
        Instant from = day.atStartOfDay(props.zone()).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(props.zone()).toInstant();

        Map<PaymentMethod, BigDecimal> amounts = new EnumMap<>(PaymentMethod.class);
        Map<PaymentMethod, Integer> counts = new EnumMap<>(PaymentMethod.class);
        BigDecimal received = BigDecimal.ZERO;
        for (Order o : orders.findByPaidTrueAndPaidAtGreaterThanEqualAndPaidAtLessThan(from, to)) {
            // valor líquido: o que ficou no caixa (total), sem o troco devolvido
            amounts.merge(o.getPaymentMethod(), o.getTotal(), BigDecimal::add);
            counts.merge(o.getPaymentMethod(), 1, Integer::sum);
            received = received.add(o.getTotal());
        }
        List<MethodTotal> byMethod = new ArrayList<>();
        for (PaymentMethod method : PaymentMethod.values()) {
            if (counts.containsKey(method)) {
                byMethod.add(new MethodTotal(method, counts.get(method), Money.round(amounts.get(method))));
            }
        }

        List<Order> receivable = orders.findByPaidFalseAndStatusNotAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                OrderStatus.CANCELLED, from, to);
        BigDecimal toReceive = BigDecimal.ZERO;
        for (Order o : receivable) {
            toReceive = toReceive.add(o.getTotal());
        }
        int cancelled = (int) orders.countByStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                OrderStatus.CANCELLED, from, to);
        return new CashClosingResponse(day, byMethod, Money.round(received), Money.round(toReceive),
                receivable.size(), cancelled);
    }

    /** Devolve ao estoque o que o pedido consumiu, conforme o livro-razão (só quando o cancelamento pede). */
    private void restoreStock(Order order, Long userId) {
        Map<Long, BigDecimal> consumed = new TreeMap<>();
        for (StockMovement m : movements.findByOrderIdAndReason(order.getId(), StockReason.ORDER)) {
            consumed.merge(m.getIngredientId(), m.getDelta().negate(), BigDecimal::add); // delta é negativo na saída
        }
        if (consumed.isEmpty()) {
            return; // pedido anterior ao livro-razão: não há o que devolver
        }
        Map<Long, Ingredient> locked = lockIngredients(consumed.keySet());
        for (Map.Entry<Long, BigDecimal> entry : consumed.entrySet()) {
            Ingredient ingredient = locked.get(entry.getKey());
            if (ingredient == null) {
                continue;
            }
            ingredient.setCurrentStock(ingredient.getCurrentStock().add(entry.getValue()));
            movements.save(new StockMovement(ingredient.getId(), order.getId(), userId,
                    entry.getValue(), StockReason.ORDER_CANCEL));
        }
    }

    /** Resolve os outros sabores (meio a meio / quartos) pelo nome. Só pizzas; até 3 sabores além do principal. */
    private List<Product> resolveFlavors(Product main, List<String> names) {
        if (names == null) {
            return List.of();
        }
        List<String> clean = names.stream().filter(n -> n != null && !n.isBlank()).map(String::strip).toList();
        if (clean.isEmpty()) {
            return List.of();
        }
        if (main.getCategory() != Category.PIZZA) {
            throw new BusinessException("Meio a meio só é permitido em pizzas (\"" + main.getName() + "\").");
        }
        if (clean.size() > 3) {
            throw new BusinessException("Uma pizza pode ter no máximo 4 sabores.");
        }
        Set<Long> seen = new java.util.HashSet<>();
        seen.add(main.getId());
        List<Product> flavors = new ArrayList<>();
        for (String name : clean) {
            Product flavor = products.findFirstByNameAndActiveTrue(name)
                    .orElseThrow(() -> new BusinessException("Sabor \"" + name + "\" não encontrado ou indisponível."));
            if (flavor.getCategory() != Category.PIZZA) {
                throw new BusinessException("\"" + name + "\" não é uma pizza.");
            }
            if (!seen.add(flavor.getId())) {
                throw new BusinessException("Sabor repetido no meio a meio: \"" + name + "\".");
            }
            flavors.add(flavor);
        }
        return flavors;
    }

    /** Trava as linhas na ordem do id (ordem fixa = sem deadlock entre pedidos concorrentes). */
    private Map<Long, Ingredient> lockIngredients(Set<Long> ids) {
        Map<Long, Ingredient> locked = new HashMap<>();
        if (ids.isEmpty()) {
            return locked;
        }
        for (Ingredient ingredient : ingredients.lockAllByIdOrdered(new ArrayList<>(ids))) {
            locked.put(ingredient.getId(), ingredient);
        }
        return locked;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
