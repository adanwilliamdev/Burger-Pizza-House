package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Anti força bruta no login, com três contadores no Redis (todos expiram sozinhos):
 * <ul>
 *   <li><b>e-mail + IP</b> (limite {@code max-attempts}): trava quem erra a senha de uma conta. Como o IP faz
 *       parte da chave, um atacante em outro IP não consegue bloquear o login de outra pessoa;</li>
 *   <li><b>IP</b> (limite {@code max-attempts * 4}): trava quem testa muitas contas a partir do mesmo IP;</li>
 *   <li><b>e-mail</b> (limite {@code max-attempts * 10}): freia ataque distribuído contra uma conta, sem
 *       tornar barato bloquear o usuário.</li>
 * </ul>
 * Se o Redis cair, o login continua funcionando (sem o limite).
 *
 * <p>O IP vem de {@code request.getRemoteAddr()}. Atrás de proxy reverso, configure
 * {@code server.forward-headers-strategy} para que o endereço real do cliente seja usado.
 */
@Service
public class LoginThrottleService {

    static final int IP_FACTOR = 4;
    static final int EMAIL_FACTOR = 10;

    private final RedisSupport redis;
    private final AppProperties props;

    public LoginThrottleService(RedisSupport redis, AppProperties props) {
        this.redis = redis;
        this.props = props;
    }

    private static String norm(String email) {
        return email == null ? "" : email.strip().toLowerCase();
    }

    private static String ipOf(String ip) {
        return ip == null || ip.isBlank() ? "unknown" : ip.strip();
    }

    private static String pairKey(String email, String ip) {
        return "login:fail:pair:" + norm(email) + "|" + ipOf(ip);
    }

    private static String ipKey(String ip) {
        return "login:fail:ip:" + ipOf(ip);
    }

    private static String emailKey(String email) {
        return "login:fail:email:" + norm(email);
    }

    public boolean isLocked(String email, String ip) {
        int max = props.login().maxAttempts();
        return reached(pairKey(email, ip), max)
                || reached(ipKey(ip), (long) max * IP_FACTOR)
                || reached(emailKey(email), (long) max * EMAIL_FACTOR);
    }

    public void registerFailure(String email, String ip) {
        Duration ttl = Duration.ofSeconds(props.login().lockSeconds());
        redis.incrementSafe(pairKey(email, ip), ttl);
        redis.incrementSafe(ipKey(ip), ttl);
        redis.incrementSafe(emailKey(email), ttl);
    }

    /** Login bem-sucedido: zera só o contador do par e-mail + IP (os demais expiram sozinhos). */
    public void clear(String email, String ip) {
        redis.deleteSafe(pairKey(email, ip));
    }

    private boolean reached(String key, long limit) {
        Optional<String> attempts = redis.getSafe(key);
        if (attempts.isEmpty()) {
            return false;
        }
        try {
            return Long.parseLong(attempts.get()) >= limit;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
