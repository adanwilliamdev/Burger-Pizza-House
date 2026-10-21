package com.burgerpizzahouse.service;

import com.burgerpizzahouse.config.AppProperties;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Anti força bruta: bloqueia temporariamente um e-mail após N falhas seguidas de login.
 * Se o Redis cair, o login continua funcionando (sem o limite).
 */
@Service
public class LoginThrottleService {

    private final RedisSupport redis;
    private final AppProperties props;

    public LoginThrottleService(RedisSupport redis, AppProperties props) {
        this.redis = redis;
        this.props = props;
    }

    private static String key(String email) {
        return "login:fail:" + (email == null ? "" : email.strip().toLowerCase());
    }

    public boolean isLocked(String email) {
        Optional<String> attempts = redis.getSafe(key(email));
        if (attempts.isEmpty()) {
            return false;
        }
        try {
            return Long.parseLong(attempts.get()) >= props.login().maxAttempts();
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public void registerFailure(String email) {
        redis.incrementSafe(key(email), Duration.ofSeconds(props.login().lockSeconds()));
    }

    public void clear(String email) {
        redis.deleteSafe(key(email));
    }
}
