package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import com.burgerpizzahouse.domain.Category;
import com.burgerpizzahouse.domain.Ingredient;
import com.burgerpizzahouse.domain.Product;
import com.burgerpizzahouse.domain.ProductIngredient;
import com.burgerpizzahouse.domain.Role;
import com.burgerpizzahouse.domain.User;
import com.burgerpizzahouse.repository.IngredientRepository;
import com.burgerpizzahouse.repository.ProductRepository;
import com.burgerpizzahouse.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dados iniciais (idempotente: nunca sobrescreve o que já existe). */
@Service
public class SeedService {

    public static final String ADMIN_EMAIL = "admin@burgerpizzahouse.com";

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    private final UserRepository users;
    private final IngredientRepository ingredients;
    private final ProductRepository products;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public SeedService(UserRepository users, IngredientRepository ingredients, ProductRepository products,
                       PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.ingredients = ingredients;
        this.products = products;
        this.encoder = encoder;
        this.props = props;
    }

    @Transactional
    public void seed() {
        log.info("Iniciando seed...");

        if (users.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty()) {
            User admin = new User("Administrador", ADMIN_EMAIL, encoder.encode(props.seed().adminPassword()), Role.ADMIN);
            admin.setSuperuser(true);
            users.save(admin);
            log.info("Admin criado: {}", ADMIN_EMAIL);
        }

        Ingredient farinha = ingredient("Farinha", "kg", "50", "10", "3.50");
        Ingredient queijo = ingredient("Queijo Mussarela", "kg", "30", "8", "25.00");
        Ingredient molho = ingredient("Molho de Tomate", "L", "20", "5", "8.00");
        Ingredient carne = ingredient("Carne Moída", "kg", "15", "5", "32.00");

        product("Pizza Margherita", "Molho de tomate, mussarela, manjericão", "45.90", "15.00",
                Category.PIZZA, 20, List.of(
                        new ProductIngredient(farinha, new BigDecimal("0.5"), "kg"),
                        new ProductIngredient(queijo, new BigDecimal("0.3"), "kg"),
                        new ProductIngredient(molho, new BigDecimal("0.2"), "L")));
        product("Pizza Calabresa", "Molho de tomate, mussarela, calabresa, cebola", "49.90", "18.00",
                Category.PIZZA, 20, List.of());
        product("Hambúrguer Clássico", "Pão, carne, queijo, alface, tomate", "32.90", "12.00",
                Category.HAMBURGUER, 15, List.of(
                        new ProductIngredient(queijo, new BigDecimal("0.1"), "kg"),
                        new ProductIngredient(carne, new BigDecimal("0.2"), "kg")));

        log.info("Seed concluída.");
    }

    private Ingredient ingredient(String name, String unit, String stock, String min, String cost) {
        return ingredients.findFirstByName(name).orElseGet(() -> ingredients.save(
                new Ingredient(name, unit, new BigDecimal(stock), new BigDecimal(min), new BigDecimal(cost))));
    }

    private void product(String name, String description, String price, String cost, Category category,
                         int preparationTime, List<ProductIngredient> recipe) {
        if (products.findFirstByName(name).isPresent()) {
            return;
        }
        Product product = new Product(name);
        product.setDescription(description);
        product.setPrice(new BigDecimal(price));
        product.setCost(new BigDecimal(cost));
        product.setCategory(category);
        product.setPreparationTime(preparationTime);
        product.replaceRecipe(recipe);
        products.save(product);
    }
}
