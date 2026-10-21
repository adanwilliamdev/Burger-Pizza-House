package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsByName(String name);

    java.util.Optional<Product> findFirstByName(String name);
}
