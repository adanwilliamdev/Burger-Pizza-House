package com.burgerpizzahouse.web;

import com.burgerpizzahouse.service.DashboardService;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class DashboardViewController {

    private static final List<Integer> PERIODS = List.of(7, 14, 30, 90);

    private final DashboardService dashboard;

    public DashboardViewController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/dashboard")
    public String dashboard(@RequestParam(defaultValue = "7") int days, Model model) {
        var summary = dashboard.summary(days);
        model.addAttribute("summary", summary);
        model.addAttribute("days", summary.days());
        model.addAttribute("periods", PERIODS);
        return "dashboard";
    }
}
