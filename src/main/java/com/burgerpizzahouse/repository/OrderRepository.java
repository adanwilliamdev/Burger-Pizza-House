package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.Order;
import com.burgerpizzahouse.domain.OrderStatus;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    @Override
    @EntityGraph(attributePaths = {"user"})
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Optional<Order> findWithUserById(Long id);

    @EntityGraph(attributePaths = {"user"})
    List<Order> findTop5ByOrderByCreatedAtDesc();

    /** Relê o pedido com lock: dois "cancelar" simultâneos não podem devolver o estoque duas vezes. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @Query("select max(o.number) from Order o")
    Integer findMaxNumber();

    long countByStatusIn(Collection<OrderStatus> statuses);

    @Query("select sum(o.total) from Order o where o.status = :status")
    BigDecimal sumTotalByStatus(@Param("status") OrderStatus status);

    @Query("select count(o) from Order o where o.createdAt >= :from and o.createdAt < :to")
    long countCreatedBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("select sum(o.total) from Order o "
            + "where o.status = :status and o.createdAt >= :from and o.createdAt < :to")
    BigDecimal sumTotalByStatusBetween(@Param("status") OrderStatus status,
                                       @Param("from") Instant from, @Param("to") Instant to);

    /**
     * Faturamento (entregues) agrupado por dia no fuso do negócio. O fuso entra uma única vez
     * (GROUP BY por posição), evitando que SELECT e GROUP BY tenham placeholders diferentes.
     */
    @Query(value = "select cast(timezone(:tz, o.created_at) as date) as day, sum(o.total) as revenue "
            + "from orders o "
            + "where o.status = 'DELIVERED' and o.created_at >= :from and o.created_at < :to "
            + "group by 1 order by 1", nativeQuery = true)
    List<Object[]> revenueByLocalDay(@Param("tz") String timeZone,
                                     @Param("from") Instant from, @Param("to") Instant to);
}
