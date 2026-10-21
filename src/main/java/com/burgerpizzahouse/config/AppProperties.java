package com.burgerpizzahouse.config;

import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configurações da aplicação (prefixo {@code app}, veja application.yml). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String env,
        String businessTimezone,
        String corsOrigins,
        Jwt jwt,
        Login login,
        Seed seed) {

    public record Jwt(String secret, int accessTokenExpireMinutes, int refreshTokenExpireDays) {
    }

    /** Proteção contra força bruta no login (por e-mail, contado no Redis). */
    public record Login(int maxAttempts, int lockSeconds) {
    }

    public record Seed(boolean enabled, String adminPassword) {
    }

    public boolean isProduction() {
        return env != null && env.equalsIgnoreCase("production");
    }

    /** Fuso usado para "hoje" e para agrupar o faturamento por dia no dashboard. */
    public ZoneId zone() {
        return ZoneId.of(businessTimezone);
    }

    public List<String> corsOriginList() {
        if (corsOrigins == null || corsOrigins.isBlank()) {
            return List.of();
        }
        return Arrays.stream(corsOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
