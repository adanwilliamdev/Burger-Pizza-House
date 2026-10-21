package com.burgerpizzahouse.service;

import com.burgerpizzahouse.dto.DashboardDtos.DashboardSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Cache do dashboard no Redis. É invalidado DEPOIS do commit da transação que mudou os números
 * (invalidar antes permitiria recachear o valor antigo); o TTL é só uma rede de segurança.
 */
@Component
public class DashboardCache {

    public static final String KEY_PREFIX = "dashboard:summary:";
    public static final int MIN_DAYS = 1;
    public static final int MAX_DAYS = 90;
    private static final Duration TTL = Duration.ofSeconds(60);

    private static final Logger log = LoggerFactory.getLogger(DashboardCache.class);

    private final RedisSupport redis;
    private final ObjectMapper mapper;

    public DashboardCache(RedisSupport redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public Optional<DashboardSummary> get(int days) {
        return redis.getSafe(KEY_PREFIX + days).flatMap(json -> {
            try {
                return Optional.of(mapper.readValue(json, DashboardSummary.class));
            } catch (Exception e) {
                log.warn("Cache do dashboard inválido; será recalculado", e);
                return Optional.empty();
            }
        });
    }

    public void put(int days, DashboardSummary summary) {
        try {
            redis.setSafe(KEY_PREFIX + days, mapper.writeValueAsString(summary), TTL);
        } catch (Exception e) {
            log.warn("Não foi possível serializar o dashboard para o cache", e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDashboardChanged(DashboardChangedEvent event) {
        invalidateAll();
    }

    public void invalidateAll() {
        List<String> keys = new ArrayList<>();
        for (int d = MIN_DAYS; d <= MAX_DAYS; d++) {
            keys.add(KEY_PREFIX + d);
        }
        redis.deleteSafe(keys);
    }
}
