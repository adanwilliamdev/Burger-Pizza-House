package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.ProductIngredient;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductIngredientRepository extends JpaRepository<ProductIngredient, Long> {

    @Query("select pi from ProductIngredient pi where pi.product.id in :productIds")
    List<ProductIngredient> findByProductIds(@Param("productIds") Collection<Long> productIds);

    @Query("select count(pi) from ProductIngredient pi where pi.ingredient.id = :ingredientId")
    long countByIngredientId(@Param("ingredientId") Long ingredientId);
}
