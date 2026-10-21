package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.dto.CatalogDtos.ProductDeleteResponse;
import com.burgerpizzahouse.dto.CatalogDtos.ProductRequest;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.dto.CatalogDtos.RecipeLineRequest;
import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.IngredientService;
import com.burgerpizzahouse.service.ProductService;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
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
public class ProductViewController {

    private final ProductService products;
    private final IngredientService ingredients;

    public ProductViewController(ProductService products, IngredientService ingredients) {
        this.products = products;
        this.ingredients = ingredients;
    }

    @GetMapping("/products")
    public String list(@RequestParam(required = false) String q,
                       @RequestParam(required = false) Category category,
                       @RequestParam(defaultValue = "true") String active,
                       Model model) {
        Boolean activeFilter = switch (active) {
            case "true" -> Boolean.TRUE;
            case "false" -> Boolean.FALSE;
            default -> null;
        };
        model.addAttribute("products", products.list(category, activeFilter, q));
        model.addAttribute("q", q == null ? "" : q);
        model.addAttribute("filterCategory", category);
        model.addAttribute("filterActive", active);
        return "products/list";
    }

    @GetMapping("/products/new")
    @PreAuthorize("hasRole('ADMIN')")
    public String newForm(Model model) {
        return form(model, ProductForm.empty(), null, null);
    }

    @GetMapping("/products/{id:\\d+}/edit")
    @PreAuthorize("hasRole('ADMIN')")
    public String editForm(@PathVariable Long id, Model model, RedirectAttributes redirect) {
        ProductResponse product;
        try {
            product = products.get(id);
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
            return "redirect:/products";
        }
        return form(model, ProductForm.from(product), id, null);
    }

    @PostMapping("/products")
    @PreAuthorize("hasRole('ADMIN')")
    public String create(@Valid @ModelAttribute("form") ProductForm form, BindingResult result, Model model,
                         RedirectAttributes redirect) {
        return save(null, form, result, model, redirect);
    }

    @PostMapping("/products/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public String update(@PathVariable Long id, @Valid @ModelAttribute("form") ProductForm form,
                         BindingResult result, Model model, RedirectAttributes redirect) {
        return save(id, form, result, model, redirect);
    }

    @PostMapping("/products/{id:\\d+}/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public String delete(@PathVariable Long id, RedirectAttributes redirect) {
        try {
            ProductDeleteResponse response = products.delete(id);
            redirect.addFlashAttribute("success", response.message());
        } catch (BusinessException e) {
            redirect.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/products";
    }

    // -------------------------------------------------------------------------------- helpers

    private String save(Long id, ProductForm form, BindingResult result, Model model, RedirectAttributes redirect) {
        List<String> errors = new ArrayList<>();
        result.getAllErrors().forEach(e -> errors.add(e.getDefaultMessage()));

        List<RecipeLineRequest> lines = new ArrayList<>();
        for (ProductForm.RecipeLineForm row : form.getLines()) {
            if (row.getIngredientId() == null) {
                continue; // linha em branco
            }
            if (row.getQuantity() == null || row.getQuantity().signum() <= 0) {
                errors.add("Informe a quantidade de cada ingrediente da receita (maior que zero).");
                break;
            }
            lines.add(new RecipeLineRequest(row.getIngredientId(), row.getQuantity(), row.getUnit()));
        }

        if (errors.isEmpty()) {
            ProductRequest request = new ProductRequest(form.getName(), form.getDescription(), form.getPrice(),
                    form.getCost(), form.getCategory(), form.getType(), form.isActive(), form.getImage(),
                    form.getPreparationTime(), lines);
            try {
                ProductResponse saved = id == null ? products.create(request) : products.update(id, request);
                redirect.addFlashAttribute("success", "Produto \"" + saved.name() + "\" salvo com sucesso.");
                return "redirect:/products";
            } catch (BusinessException e) {
                errors.add(e.getMessage());
            }
        }
        // devolve o formulário com o que foi digitado (e linhas em branco suficientes)
        form.getLines().removeIf(row -> row.getIngredientId() == null);
        form.padRecipeRows();
        return form(model, form, id, errors);
    }

    private String form(Model model, ProductForm form, Long id, List<String> errors) {
        model.addAttribute("form", form);
        model.addAttribute("productId", id);
        model.addAttribute("errors", errors);
        model.addAttribute("ingredients", ingredients.list(false));
        return "products/form";
    }
}
