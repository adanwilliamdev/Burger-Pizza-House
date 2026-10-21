package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.AuditLog;
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
import com.burgerpizzahouse.service.StockCalculator.Line;
import com.burgerpizzahouse.service.StockCalculator.RecipeEntry;
import com.burgerpizzahouse.service.StockCalculator.Shortage;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
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
        for (OrderItemRequest item : data.items()) {
            Product product = byId.get(item.productId());
            if (product == null) {
                throw BusinessException.notFound("Produto não encontrado");
            }
            if (!product.isActive()) {
                throw new BusinessException("Produto \"" + product.getName() + "\" não está mais disponível");
            }
            BigDecimal totalPrice = Money.round(product.getPrice().multiply(BigDecimal.valueOf(item.quantity())));
            subtotal = Money.round(subtotal.add(totalPrice));
            items.add(new OrderItem(product, item.quantity(), product.getPrice(), totalPrice,
                    blankToNull(item.notes()), item.halfFlavors()));
        }

        BigDecimal discount = Money.round(Money.orZero(data.discount()));
        BigDecimal deliveryFee = Money.round(Money.orZero(data.deliveryFee()));
        if (discount.compareTo(subtotal) > 0) {
            throw new BusinessException("O desconto não pode ser maior que o subtotal do pedido");
        }
        BigDecimal total = Money.round(subtotal.subtract(discount).add(deliveryFee));

        // --- estoque: soma por ingrediente, trava as linhas e só então valida
        Map<Long, List<RecipeEntry>> recipes = new HashMap<>();
        for (ProductIngredient pi : recipeLines.findByProductIds(productIds)) {
            recipes.computeIfAbsent(pi.getProduct().getId(), k -> new ArrayList<>())
                    .add(new RecipeEntry(pi.getIngredient().getId(), pi.getQuantity()));
        }
        List<Line> lines = data.items().stream()
                .map(i -> new Line(i.productId(), i.quantity()))
                .toList();
        Map<Long, BigDecimal> required = StockCalculator.aggregateRequired(lines, recipes);

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
        // Relê o pedido com lock: dois "cancelar" simultâneos não podem devolver o estoque duas vezes.
        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> BusinessException.notFound("Pedido não encontrado."));
        OrderStatus oldStatus = order.getStatus();

        if (!oldStatus.canTransitionTo(newStatus)) {
            throw BusinessException.conflict("Não é possível mudar o status de \"" + oldStatus.getLabel()
                    + "\" para \"" + newStatus.getLabel() + "\"");
        }

        order.setStatus(newStatus);
        if (newStatus == OrderStatus.CANCELLED) {
            restoreStock(order, userId);
        }

        orders.saveAndFlush(order);
        audits.save(new AuditLog(userId, "UPDATE_ORDER_STATUS", "Order", String.valueOf(order.getId()),
                "Status alterado de " + oldStatus.name() + " para " + newStatus.name()));
        events.publishEvent(new DashboardChangedEvent());
        return Mappers.toResponse(order);
    }

    /** Devolve ao estoque o que o pedido consumiu, conforme o livro-razão. */
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
