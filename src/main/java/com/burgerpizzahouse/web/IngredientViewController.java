package com.burgerpizzahouse.web;

import com.burgerpizzahouse.dto.CatalogDtos.IngredientRequest;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import com.burgerpizzahouse.dto.CatalogDtos.StockAdjustRequest;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.IngredientService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class IngredientViewController {

    private final IngredientService ingredients;

    public IngredientViewController(IngredientService ingredients) {
        this.ingredients = ingredients;
    }

    @GetMapping("/ingredients")
    public String list(@RequestParam(name = "low_stock", defaultValue = "false") boolean lowStock, Model model) {
        model.addAttribute("ingredients", ingredients.list(lowStock));
        model.addAttribute("lowStockOnly", lowStock);
        return "ingredients/list";
    }

    @GetMapping("/ingredients/new")
    @PreAuthorize("hasRole('ADMIN')")
    public String newForm(Model model) {
        model.addAttribute("form", new IngredientForm());
        model.addAttribute("ingredientId", null);
        return "ingredients/form";
    }

    @GetMapping("/ingredients/{id:\\d+}/edit")
    @PreAuthorize("hasRole('ADMIN')")
    public String editForm(@PathVariable Long id, Model model, RedirectAttributes redirect) {
        IngredientResponse ingredient;
        try {
            ingredient = ingredients.get(id);
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
            return "redirect:/ingredients";
        }
        model.addAttribute("form", IngredientForm.from(ingredient));
        model.addAttribute("ingredient", ingredient);
        model.addAttribute("ingredientId", id);
        return "ingredients/form";
    }

    @PostMapping("/ingredients")
    @PreAuthorize("hasRole('ADMIN')")
    public String create(@Valid @ModelAttribute("form") IngredientForm form, BindingResult result, Model model,
                         RedirectAttributes redirect) {
        return save(null, form, result, model, redirect, null);
    }

    @PostMapping("/ingredients/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public String update(@PathVariable Long id, @Valid @ModelAttribute("form") IngredientForm form,
                         BindingResult result, Model model, RedirectAttributes redirect,
                         @AuthenticationPrincipal AppUserDetails me) {
        return save(id, form, result, model, redirect, me.getId());
    }

    @PostMapping("/ingredients/{id:\\d+}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    public String adjustStock(@PathVariable Long id, @RequestParam String operation,
                              @RequestParam(required = false) String quantity,
                              @AuthenticationPrincipal AppUserDetails me, RedirectAttributes redirect) {
        BigDecimal value;
        try {
            value = new BigDecimal(quantity == null ? "" : quantity.strip().replace(',', '.'));
        } catch (NumberFormatException e) {
            redirect.addFlashAttribute("error", "Informe uma quantidade maior que zero.");
            return "redirect:/ingredients/" + id + "/edit";
        }
        if (value.signum() <= 0 || !("add".equals(operation) || "remove".equals(operation))) {
            redirect.addFlashAttribute("error", "Informe uma quantidade maior que zero.");
            return "redirect:/ingredients/" + id + "/edit";
        }
        try {
            IngredientResponse updated = ingredients.adjustStock(id, new StockAdjustRequest(operation, value), me.getId());
            String qty = value.stripTrailingZeros().toPlainString();
            redirect.addFlashAttribute("success", "add".equals(operation)
                    ? qty + " " + updated.unit() + " adicionado(s) ao estoque."
                    : qty + " " + updated.unit() + " removido(s) do estoque.");
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/ingredients/" + id + "/edit";
    }

    @PostMapping("/ingredients/{id:\\d+}/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public String delete(@PathVariable Long id, RedirectAttributes redirect) {
        try {
            ingredients.delete(id);
            redirect.addFlashAttribute("success", "Ingrediente excluído.");
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/ingredients";
    }

    private String save(Long id, IngredientForm form, BindingResult result, Model model, RedirectAttributes redirect,
                        Long adminId) {
        List<String> errors = new ArrayList<>();
        result.getAllErrors().forEach(e -> errors.add(e.getDefaultMessage()));
        if (errors.isEmpty()) {
            // Na edição o saldo não vem do formulário (poderia estar desatualizado): ajuste só pelo "Ajustar estoque".
            IngredientRequest request = new IngredientRequest(form.getName(), form.getUnit(),
                    id == null ? form.getCurrentStock() : null, form.getMinStock(), form.getCostPerUnit());
            try {
                IngredientResponse saved = id == null ? ingredients.create(request) : ingredients.update(id, request, adminId);
                redirect.addFlashAttribute("success", "Ingrediente \"" + saved.name() + "\" salvo com sucesso.");
                return "redirect:/ingredients";
            } catch (BusinessException e) {
                errors.add(e.getMessage());
            }
        }
        model.addAttribute("errors", errors);
        model.addAttribute("ingredientId", id);
        if (id != null) {
            try {
                model.addAttribute("ingredient", ingredients.get(id));
            } catch (BusinessException e) {
                redirect.addFlashAttribute("error", e.getMessage());
                return "redirect:/ingredients";
            }
        }
        return "ingredients/form";
    }
}
