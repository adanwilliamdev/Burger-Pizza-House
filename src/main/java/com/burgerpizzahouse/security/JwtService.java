package com.burgerpizzahouse.security;

import com.burgerpizzahouse.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** Emissão e validação dos JWT (access e refresh), assinados com HS256. */
@Service
public class JwtService {

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private static final String DEFAULT_SECRET_PREFIX = "troque-esta-chave";

    private final AppProperties props;
    private final SecretKey key;

    public JwtService(AppProperties props) {
        this.props = props;
        String secret = props.jwt().secret();
        // Em produção a chave padrão do repositório seria publicamente conhecida (qualquer um forjaria
        // tokens ADMIN), então a aplicação se recusa a subir.
        if (props.isProduction() && (secret == null || secret.startsWith(DEFAULT_SECRET_PREFIX) || secret.length() < 32)) {
            throw new IllegalStateException(
                    "JWT_SECRET_KEY inseguro para APP_ENV=production: use um valor aleatório com 32+ caracteres.");
        }
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET_KEY precisa ter ao menos 32 caracteres.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(long userId) {
        return create(userId, Duration.ofMinutes(props.jwt().accessTokenExpireMinutes()), TYPE_ACCESS);
    }

    public String createRefreshToken(long userId) {
        return create(userId, Duration.ofDays(props.jwt().refreshTokenExpireDays()), TYPE_REFRESH);
    }

    private String create(long userId, Duration ttl, String type) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", type)
                // jti único: sem ele, dois tokens emitidos no mesmo segundo seriam idênticos e revogar
                // um (rotação do refresh) revogaria o outro.
                .id(UUID.randomUUID().toString().replace("-", ""))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** Devolve as claims se a assinatura e a validade estiverem corretas; vazio caso contrário. */
    public Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public Optional<Claims> parseOfType(String token, String expectedType) {
        return parse(token).filter(c -> expectedType.equals(c.get("type", String.class)));
    }

    /** Segundos restantes de validade do token (mínimo 1). */
    public Duration remainingTtl(Claims claims) {
        if (claims.getExpiration() == null) {
            return Duration.ofDays(props.jwt().refreshTokenExpireDays());
        }
        long seconds = Duration.between(Instant.now(), claims.getExpiration().toInstant()).getSeconds();
        return Duration.ofSeconds(Math.max(seconds, 1));
    }
}
