package com.burgerpizzahouse.repository;

import com.burgerpizzahouse.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
