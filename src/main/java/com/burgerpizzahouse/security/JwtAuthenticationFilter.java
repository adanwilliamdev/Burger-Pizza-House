package com.burgerpizzahouse.security;

import com.burgerpizzahouse.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Autentica as requisições da API a partir do header {@code Authorization: Bearer <access token>}.
 * Não é um bean (é criado na configuração de segurança) para não ser registrado duas vezes no servlet.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(PREFIX)) {
            authenticate(header.substring(PREFIX.length()).strip());
        }
        chain.doFilter(request, response);
    }

    private void authenticate(String token) {
        Optional<Claims> claims = jwt.parseOfType(token, JwtService.TYPE_ACCESS);
        if (claims.isEmpty() || claims.get().getSubject() == null) {
            return;
        }
        long userId;
        try {
            userId = Long.parseLong(claims.get().getSubject());
        } catch (NumberFormatException e) {
            return;
        }
        users.findById(userId)
                .filter(u -> u.isActive())
                .map(AppUserDetails::new)
                .ifPresent(details -> SecurityContextHolder.getContext().setAuthentication(
                        UsernamePasswordAuthenticationToken.authenticated(details, null, details.getAuthorities())));
    }
}
