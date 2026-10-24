package com.burgerpizzahouse.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.burgerpizzahouse.config.AppProperties;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LoginThrottleServiceTest {

    private static final int MAX = 5;

    /** Redis em memória: só os métodos que o throttle usa. */
    static class FakeRedis extends RedisSupport {
        final Map<String, Long> counters = new HashMap<>();

        FakeRedis() {
            super(null);
        }

        @Override
        public Optional<String> getSafe(String key) {
            return Optional.ofNullable(counters.get(key)).map(String::valueOf);
        }

        @Override
        public long incrementSafe(String key, Duration ttlOnFirst) {
            return counters.merge(key, 1L, Long::sum);
        }

        @Override
        public void deleteSafe(String key) {
            counters.remove(key);
        }
    }

    private LoginThrottleService throttle;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties("development", "America/Sao_Paulo", "", null,
                new AppProperties.Login(MAX, 900), null);
        throttle = new LoginThrottleService(new FakeRedis(), props);
    }

    private void fail(String email, String ip, int times) {
        for (int i = 0; i < times; i++) {
            throttle.registerFailure(email, ip);
        }
    }

    @Test
    void locksEmailFromTheSameIpAfterMaxAttempts() {
        fail("ana@x.com", "10.0.0.1", MAX - 1);
        assertFalse(throttle.isLocked("ana@x.com", "10.0.0.1"));
        fail("ana@x.com", "10.0.0.1", 1);
        assertTrue(throttle.isLocked("ana@x.com", "10.0.0.1"));
    }

    @Test
    void attackerFromAnotherIpCannotLockTheVictim() {
        fail("ana@x.com", "10.0.0.66", MAX * 3);
        assertTrue(throttle.isLocked("ana@x.com", "10.0.0.66"));
        assertFalse(throttle.isLocked("ana@x.com", "10.0.0.1"));
    }

    @Test
    void emailMatchingIsCaseAndWhitespaceInsensitive() {
        fail("  Ana@X.com ", "10.0.0.1", MAX);
        assertTrue(throttle.isLocked("ana@x.com", "10.0.0.1"));
    }

    @Test
    void locksAnIpThatTriesManyAccounts() {
        for (int i = 0; i < MAX * LoginThrottleService.IP_FACTOR; i++) {
            fail("user" + i + "@x.com", "10.0.0.9", 1);
        }
        assertTrue(throttle.isLocked("new@x.com", "10.0.0.9"));
        assertFalse(throttle.isLocked("new@x.com", "10.0.0.10"));
    }

    @Test
    void locksAnAccountUnderDistributedAttack() {
        for (int i = 0; i < MAX * LoginThrottleService.EMAIL_FACTOR; i++) {
            fail("ana@x.com", "10.1." + (i / 250) + "." + (i % 250), 1);
        }
        assertTrue(throttle.isLocked("ana@x.com", "192.168.0.1"));
    }

    @Test
    void successfulLoginClearsThePairCounter() {
        fail("ana@x.com", "10.0.0.1", MAX);
        assertTrue(throttle.isLocked("ana@x.com", "10.0.0.1"));
        throttle.clear("ana@x.com", "10.0.0.1");
        assertFalse(throttle.isLocked("ana@x.com", "10.0.0.1"));
    }
}
