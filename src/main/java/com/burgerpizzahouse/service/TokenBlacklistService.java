package com.burgerpizzahouse.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import org.springframework.stereotype.Service;

/**
 * Blacklist de refresh tokens no Redis. Guarda só o hash SHA-256: o token completo (credencial
 * válida) não fica em texto puro no Redis. Falha "fechada": se o Redis estiver fora, a exceção
 * é propagada e a operação é recusada.
 */
@Service
public class TokenBlacklistService {

    private final RedisSupport redis;

    public TokenBlacklistService(RedisSupport redis) {
        this.redis = redis;
    }

    private static String key(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return "blacklist:" + HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    public boolean isRevoked(String token) {
        return redis.existsStrict(key(token));
    }

    public void revoke(String token, Duration ttl) {
        Duration safeTtl = ttl.isNegative() || ttl.isZero() ? Duration.ofSeconds(1) : ttl;
        redis.setStrict(key(token), "1", safeTtl);
    }
}
