package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.OrderItem;
import com.burgerpizzahouse.domain.OrderStatus;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query("select count(oi) from OrderItem oi where oi.product.id = :productId")
    long countByProductId(@Param("productId") Long productId);

    /** Mais vendidos (pedidos cancelados não contam): [productId, name, price, totalSold]. */
    @Query("select p.id, p.name, p.price, sum(oi.quantity) "
            + "from OrderItem oi join oi.product p join oi.order o "
            + "where o.status <> :excluded "
            + "group by p.id, p.name, p.price "
            + "order by sum(oi.quantity) desc, p.name asc")
    List<Object[]> topProducts(@Param("excluded") OrderStatus excluded, Pageable pageable);
}
