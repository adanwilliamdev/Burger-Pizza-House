package com.burgerpizzahouse.api;

import com.burgerpizzahouse.dto.DashboardDtos.DashboardSummary;
import com.burgerpizzahouse.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "dashboard")
public class DashboardApiController {

    private final DashboardService dashboard;

    public DashboardApiController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping
    public DashboardSummary summary(@RequestParam(defaultValue = "7") int days) {
        return dashboard.summary(days);
    }
}
