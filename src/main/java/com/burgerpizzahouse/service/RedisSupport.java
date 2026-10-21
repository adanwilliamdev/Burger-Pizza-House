package com.burgerpizzahouse.service;

import java.time.Duration;
import java.util.Collection;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Acesso ao Redis com dois modos.
 *
 * <p>O Redis aqui é auxiliar (cache do dashboard, blacklist de tokens, contador de tentativas de
 * login). Se ele cair, o ERP não pode parar de vender: os métodos "safe" degradam silenciosamente
 * (com log). Só a blacklist de tokens usa os métodos "strict", que propagam a falha para a chamada
 * recusar a operação em vez de aceitar um token possivelmente revogado.
 */
@Component
public class RedisSupport {

    private static final Logger log = LoggerFactory.getLogger(RedisSupport.class);

    private final StringRedisTemplate redis;

    public RedisSupport(StringRedisTemplate redis) {
        this.redis = redis;
    }

    // ------------------------------------------------------------------ safe

    public Optional<String> getSafe(String key) {
        try {
            return Optional.ofNullable(redis.opsForValue().get(key));
        } catch (RuntimeException e) {
            log.warn("Redis indisponível ao ler {}", key, e);
            return Optional.empty();
        }
    }

    public void setSafe(String key, String value, Duration ttl) {
        try {
            redis.opsForValue().set(key, value, ttl);
        } catch (RuntimeException e) {
            log.warn("Redis indisponível ao gravar {}", key, e);
        }
    }

    public void deleteSafe(Collection<String> keys) {
        try {
            if (!keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (RuntimeException e) {
            log.warn("Redis indisponível ao apagar chaves", e);
        }
    }

    public void deleteSafe(String key) {
        try {
            redis.delete(key);
        } catch (RuntimeException e) {
            log.warn("Redis indisponível ao apagar {}", key, e);
        }
    }

    /** Incrementa um contador e, na primeira vez, define o TTL. Devolve -1 se o Redis estiver fora. */
    public long incrementSafe(String key, Duration ttlOnFirst) {
        try {
            Long value = redis.opsForValue().increment(key);
            if (value != null && value == 1L) {
                redis.expire(key, ttlOnFirst);
            }
            return value == null ? -1 : value;
        } catch (RuntimeException e) {
            log.warn("Redis indisponível ao incrementar {}", key, e);
            return -1;
        }
    }

    // ---------------------------------------------------------------- strict

    public boolean existsStrict(String key) {
        return Boolean.TRUE.equals(redis.hasKey(key));
    }

    public void setStrict(String key, String value, Duration ttl) {
        redis.opsForValue().set(key, value, ttl);
    }

    /** Verifica se o Redis responde (usado no readiness). Lança exceção se não responder. */
    public void ping() {
        String pong = redis.execute((org.springframework.data.redis.core.RedisCallback<String>) c -> c.ping());
        if (pong == null) {
            throw new IllegalStateException("Redis não respondeu ao PING");
        }
    }
}
