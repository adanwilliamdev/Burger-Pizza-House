package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.Ingredient;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    List<Ingredient> findAllByOrderByNameAsc();

    @Query("select i from Ingredient i where i.currentStock <= i.minStock order by i.name")
    List<Ingredient> findLowStock();

    @Query("select count(i) from Ingredient i where i.currentStock <= i.minStock")
    long countLowStock();

    Optional<Ingredient> findFirstByName(String name);

    /** SELECT ... FOR UPDATE de um único ingrediente. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i where i.id = :id")
    Optional<Ingredient> findByIdForUpdate(@Param("id") Long id);

    /**
     * Trava várias linhas (SELECT ... FOR UPDATE) SEMPRE em ordem de id: ordem fixa = sem deadlock
     * entre pedidos concorrentes.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i where i.id in :ids order by i.id")
    List<Ingredient> lockAllByIdOrdered(@Param("ids") Collection<Long> ids);
}
