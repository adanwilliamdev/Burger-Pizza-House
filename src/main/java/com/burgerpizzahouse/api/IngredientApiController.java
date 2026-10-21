package com.burgerpizzahouse.api;

import com.burgerpizzahouse.dto.CatalogDtos.IngredientRequest;
import com.burgerpizzahouse.dto.CatalogDtos.IngredientResponse;
import com.burgerpizzahouse.dto.CatalogDtos.StockAdjustRequest;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.IngredientService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ingredients")
@Tag(name = "ingredients")
public class IngredientApiController {

    private final IngredientService ingredients;

    public IngredientApiController(IngredientService ingredients) {
        this.ingredients = ingredients;
    }

    @GetMapping
    public List<IngredientResponse> list(@RequestParam(name = "low_stock", defaultValue = "false") boolean lowStock) {
        return ingredients.list(lowStock);
    }

    @GetMapping("/{id}")
    public IngredientResponse get(@PathVariable Long id) {
        return ingredients.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public IngredientResponse create(@Valid @RequestBody IngredientRequest request) {
        return ingredients.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public IngredientResponse update(@PathVariable Long id, @Valid @RequestBody IngredientRequest request) {
        return ingredients.update(id, request);
    }

    @PostMapping("/{id}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    public IngredientResponse adjustStock(@PathVariable Long id, @Valid @RequestBody StockAdjustRequest request,
                                          @AuthenticationPrincipal AppUserDetails admin) {
        return ingredients.adjustStock(id, request, admin.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        ingredients.delete(id);
    }
}
