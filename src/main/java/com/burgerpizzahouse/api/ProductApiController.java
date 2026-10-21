package com.burgerpizzahouse.api;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.dto.CatalogDtos.ProductDeleteResponse;
import com.burgerpizzahouse.dto.CatalogDtos.ProductRequest;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.service.ProductService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/products")
@Tag(name = "products")
public class ProductApiController {

    private final ProductService products;

    public ProductApiController(ProductService products) {
        this.products = products;
    }

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) Category category,
                                      @RequestParam(name = "is_active", defaultValue = "true") Boolean isActive,
                                      @RequestParam(required = false) String q) {
        return products.list(category, isActive, q);
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return products.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return products.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return products.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDeleteResponse delete(@PathVariable Long id) {
        return products.delete(id);
    }
}
