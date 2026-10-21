package com.burgerpizzahouse.api;

import com.burgerpizzahouse.service.RedisSupport;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Tag(name = "health")
public class HealthApiController {

    private final JdbcTemplate jdbc;
    private final RedisSupport redis;

    public HealthApiController(JdbcTemplate jdbc, RedisSupport redis) {
        this.jdbc = jdbc;
        this.redis = redis;
    }

    @GetMapping
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    /** Readiness: confirma que Postgres e Redis respondem (usado pelo healthcheck do Docker). */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> ready() {
        try {
            jdbc.queryForObject("select 1", Integer.class);
            redis.ping();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("detail", "Dependência indisponível"));
        }
        return ResponseEntity.ok(Map.of("status", "ready"));
    }
}
