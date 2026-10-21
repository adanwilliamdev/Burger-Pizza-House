package com.burgerpizzahouse.service;

import com.burgerpizzahouse.domain.User;
import com.burgerpizzahouse.dto.AuthDtos.LoginRequest;
import com.burgerpizzahouse.dto.AuthDtos.LoginResponse;
import com.burgerpizzahouse.dto.AuthDtos.TokenPair;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import com.burgerpizzahouse.repository.UserRepository;
import com.burgerpizzahouse.security.JwtService;
import io.jsonwebtoken.Claims;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Autenticação da API REST: login, rotação de refresh token e logout. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String UNAVAILABLE = "Serviço temporariamente indisponível.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final TokenBlacklistService blacklist;
    private final LoginThrottleService throttle;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                       TokenBlacklistService blacklist, LoginThrottleService throttle) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.blacklist = blacklist;
        this.throttle = throttle;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().strip();
        if (throttle.isLocked(email)) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas de login. Tente novamente em alguns minutos.");
        }

        Optional<User> found = users.findByEmailIgnoreCase(email);
        if (found.isEmpty() || !encoder.matches(request.password(), found.get().getPasswordHash())) {
            throttle.registerFailure(email);
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas.");
        }
        User user = found.get();
        if (!user.isActive()) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Esta conta está inativa.");
        }

        throttle.clear(email);
        return new LoginResponse(jwt.createAccessToken(user.getId()), jwt.createRefreshToken(user.getId()),
                "bearer", Mappers.toResponse(user));
    }

    @Transactional(readOnly = true)
    public TokenPair refresh(String refreshToken) {
        BusinessException invalid = new BusinessException(HttpStatus.UNAUTHORIZED, "Refresh token inválido.");

        Claims claims = jwt.parseOfType(refreshToken, JwtService.TYPE_REFRESH).orElseThrow(() -> invalid);

        // Aqui o Redis é requisito de segurança (blacklist): se estiver fora, recusa em vez de aceitar
        // um token possivelmente revogado.
        boolean revoked;
        try {
            revoked = blacklist.isRevoked(refreshToken);
        } catch (RuntimeException e) {
            log.error("Redis indisponível ao validar refresh token", e);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        }
        if (revoked) {
            throw invalid;
        }

        User user = parseUserId(claims).flatMap(users::findById).filter(User::isActive).orElseThrow(() -> invalid);

        // Rotação: o refresh usado é revogado; reutilizar o token antigo deixa de funcionar.
        try {
            blacklist.revoke(refreshToken, jwt.remainingTtl(claims));
        } catch (RuntimeException e) {
            log.error("Redis indisponível ao revogar refresh token", e);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        }
        return TokenPair.bearer(jwt.createAccessToken(user.getId()), jwt.createRefreshToken(user.getId()));
    }

    /** Revoga o refresh token (blacklist até expirar). Token inválido/expirado: já não vale nada. */
    public void logout(String refreshToken) {
        Optional<Claims> claims = jwt.parse(refreshToken);
        if (claims.isEmpty()) {
            return;
        }
        try {
            blacklist.revoke(refreshToken, jwt.remainingTtl(claims.get()));
        } catch (RuntimeException e) {
            log.error("Redis indisponível no logout", e);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, UNAVAILABLE);
        }
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return users.findById(userId).map(Mappers::toResponse)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Não autenticado"));
    }

    private static Optional<Long> parseUserId(Claims claims) {
        try {
            return Optional.of(Long.parseLong(claims.getSubject()));
        } catch (NumberFormatException | NullPointerException e) {
            return Optional.empty();
        }
    }
}
