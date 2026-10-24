package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.StockMovement;
import com.burgerpizzahouse.domain.StockReason;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByOrderIdAndReason(Long orderId, StockReason reason);

    long countByIngredientId(Long ingredientId);
}
