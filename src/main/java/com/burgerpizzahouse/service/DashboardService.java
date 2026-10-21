package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.OrderStatus;
import com.burgerpizzahouse.dto.DashboardDtos.DashboardSummary;
import com.burgerpizzahouse.dto.DashboardDtos.RevenueByDay;
import com.burgerpizzahouse.dto.DashboardDtos.TopProduct;
import com.burgerpizzahouse.dto.OrderDtos.OrderResponse;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.OrderItemRepository;
import com.burgerpizzahouse.repository.OrderRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DashboardService {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd/MM");

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final IngredientRepository ingredients;
    private final DashboardCache cache;
    private final AppProperties props;
    private final TransactionTemplate readOnlyTx;

    public DashboardService(OrderRepository orders, OrderItemRepository orderItems,
                            IngredientRepository ingredients, DashboardCache cache, AppProperties props,
                            PlatformTransactionManager txManager) {
        this.orders = orders;
        this.orderItems = orderItems;
        this.ingredients = ingredients;
        this.cache = cache;
        this.props = props;
        this.readOnlyTx = new TransactionTemplate(txManager);
        this.readOnlyTx.setReadOnly(true);
    }

    public DashboardSummary summary(int requestedDays) {
        int days = Math.min(DashboardCache.MAX_DAYS, Math.max(DashboardCache.MIN_DAYS, requestedDays));

        Optional<DashboardSummary> cached = cache.get(days);
        if (cached.isPresent()) {
            return cached.get();
        }
        DashboardSummary summary = readOnlyTx.execute(status -> compute(days));
        cache.put(days, summary);
        return summary;
    }

    private DashboardSummary compute(int days) {
        // "Hoje" e o agrupamento por dia usam o fuso do negócio, não UTC — senão pedidos feitos
        // às 22h em São Paulo cairiam no "dia seguinte".
        ZoneId zone = props.zone();
        LocalDate today = LocalDate.now(zone);
        Instant todayStart = today.atStartOfDay(zone).toInstant();
        Instant tomorrowStart = today.plusDays(1).atStartOfDay(zone).toInstant();
        Instant windowStart = today.minusDays(days - 1L).atStartOfDay(zone).toInstant();

        long totalOrders = orders.count();
        BigDecimal totalRevenue = Money.round(Money.orZero(orders.sumTotalByStatus(OrderStatus.DELIVERED)));
        long pendingOrders = orders.countByStatusIn(OrderStatus.openStatuses());
        long todayOrders = orders.countCreatedBetween(todayStart, tomorrowStart);
        BigDecimal todayRevenue = Money.round(Money.orZero(
                orders.sumTotalByStatusBetween(OrderStatus.DELIVERED, todayStart, tomorrowStart)));
        long lowStock = ingredients.countLowStock();

        List<TopProduct> topProducts = new ArrayList<>();
        for (Object[] row : orderItems.topProducts(OrderStatus.CANCELLED, PageRequest.of(0, 5))) {
            topProducts.add(new TopProduct(((Number) row[0]).longValue(), (String) row[1],
                    (BigDecimal) row[2], ((Number) row[3]).longValue()));
        }

        // Faturamento diário: 1 query agrupada no banco.
        Map<LocalDate, BigDecimal> revenueMap = new HashMap<>();
        for (Object[] row : orders.revenueByLocalDay(zone.getId(), windowStart, tomorrowStart)) {
            revenueMap.put(toLocalDate(row[0]), new BigDecimal(row[1].toString()));
        }
        LocalDate firstDay = today.minusDays(days - 1L);
        List<BigDecimal> revenues = new ArrayList<>();
        List<LocalDate> dates = new ArrayList<>();
        BigDecimal max = BigDecimal.ZERO;
        for (int offset = 0; offset < days; offset++) {
            LocalDate day = firstDay.plusDays(offset);
            BigDecimal revenue = Money.round(revenueMap.getOrDefault(day, BigDecimal.ZERO));
            dates.add(day);
            revenues.add(revenue);
            if (revenue.compareTo(max) > 0) {
                max = revenue;
            }
        }
        BigDecimal maxRevenue = max.signum() > 0 ? max : BigDecimal.ONE;
        List<RevenueByDay> revenueByDay = new ArrayList<>();
        for (int i = 0; i < dates.size(); i++) {
            int percent = revenues.get(i)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(maxRevenue, 0, RoundingMode.HALF_UP)
                    .intValue();
            revenueByDay.add(new RevenueByDay(dates.get(i).toString(), DAY_LABEL.format(dates.get(i)),
                    revenues.get(i), percent));
        }

        List<OrderResponse> recent = orders.findTop5ByOrderByCreatedAtDesc().stream()
                .map(Mappers::toResponse)
                .toList();

        return new DashboardSummary(totalOrders, totalRevenue, pendingOrders, lowStock, todayOrders, todayRevenue,
                topProducts, revenueByDay, maxRevenue, recent, days);
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        return LocalDate.parse(value.toString().substring(0, 10));
    }
}
