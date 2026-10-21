package com.burgerpizzahouse.service;

import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.Product;
import com.burgerpizzahouse.domain.ProductIngredient;
import com.burgerpizzahouse.domain.ProductType;
import com.burgerpizzahouse.dto.CatalogDtos.ProductDeleteResponse;
import com.burgerpizzahouse.dto.CatalogDtos.ProductRequest;
import com.burgerpizzahouse.dto.CatalogDtos.ProductResponse;
import com.burgerpizzahouse.dto.CatalogDtos.RecipeLineRequest;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.OrderItemRepository;
import com.burgerpizzahouse.repository.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    /** Um cardápio real não passa de algumas centenas de itens: um teto simples evita crescimento descontrolado. */
    private static final int LIST_LIMIT = 500;

    private final ProductRepository products;
    private final IngredientRepository ingredients;
    private final OrderItemRepository orderItems;

    public ProductService(ProductRepository products, IngredientRepository ingredients,
                          OrderItemRepository orderItems) {
        this.products = products;
        this.ingredients = ingredients;
        this.orderItems = orderItems;
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list(Category category, Boolean active, String q) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (q != null && !q.isBlank()) {
                String escaped = q.strip().toLowerCase()
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
                predicates.add(cb.like(cb.lower(root.<String>get("name")), "%" + escaped + "%", '\\'));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return products.findAll(spec, PageRequest.of(0, LIST_LIMIT, Sort.by("name"))).getContent().stream()
                .map(Mappers::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return Mappers.toResponse(find(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = new Product(request.name().strip());
        apply(product, request);
        products.save(product);
        return Mappers.toResponse(product);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = find(id);
        product.setName(request.name().strip());
        apply(product, request);
        products.saveAndFlush(product);
        return Mappers.toResponse(product);
    }

    /**
     * Produto que já apareceu em algum pedido não é apagado de verdade (destruiria o histórico):
     * é desativado — some do cardápio, mas os pedidos antigos continuam íntegros.
     */
    @Transactional
    public ProductDeleteResponse delete(Long id) {
        Product product = find(id);
        if (orderItems.countByProductId(id) > 0) {
            product.setActive(false);
            products.saveAndFlush(product);
            return new ProductDeleteResponse(true, "Produto \"" + product.getName()
                    + "\" possui pedidos associados; foi desativado em vez de excluído.");
        }
        products.delete(product);
        return new ProductDeleteResponse(false, "Produto \"" + product.getName() + "\" excluído com sucesso.");
    }

    private void apply(Product product, ProductRequest r) {
        product.setDescription(r.description() == null || r.description().isBlank() ? null : r.description().strip());
        product.setPrice(Money.round(r.price()));
        product.setCost(Money.round(Money.orZero(r.cost())));
        product.setCategory(r.category() == null ? Category.PIZZA : r.category());
        product.setType(r.type() == null ? ProductType.SIMPLE : r.type());
        product.setActive(r.isActive() == null || r.isActive());
        product.setImage(r.image() == null || r.image().isBlank() ? null : r.image().strip());
        product.setPreparationTime(r.preparationTime() == null || r.preparationTime() < 1 ? 15 : r.preparationTime());

        // Substitui a receita inteira: as linhas antigas somem, as novas são recriadas.
        List<ProductIngredient> newLines = new ArrayList<>();
        if (r.ingredients() != null) {
            for (RecipeLineRequest line : r.ingredients()) {
                var ingredient = ingredients.findById(line.ingredientId())
                        .orElseThrow(() -> BusinessException.notFound("Ingrediente não encontrado."));
                String unit = line.unit() == null || line.unit().isBlank() ? ingredient.getUnit() : line.unit().strip();
                BigDecimal quantity = line.quantity();
                newLines.add(new ProductIngredient(ingredient, quantity, unit));
            }
        }
        product.replaceRecipe(newLines);
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> BusinessException.notFound("Produto não encontrado."));
    }
}
