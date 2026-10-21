package com.burgerpizzahouse.dto;

import java.math.BigDecimal;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record TopProduct(Long id, String name, BigDecimal price, long totalSold) {
    }

    /** {@code percent} (0–100) é a altura relativa da barra no gráfico. */
    public record RevenueByDay(String date, String label, BigDecimal revenue, int percent) {
    }

    public record DashboardSummary(
            long totalOrders,
            BigDecimal totalRevenue,
            long pendingOrders,
            long lowStock,
            long todayOrders,
            BigDecimal todayRevenue,
            List<TopProduct> topProducts,
            List<RevenueByDay> revenueByDay,
            BigDecimal maxRevenue,
            List<OrderDtos.OrderResponse> recentOrders,
            int days) {
    }
}
