package com.burgerpizzahouse.security;

import com.burgerpizzahouse.service.LoginThrottleService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Recusa o POST /login de e-mails bloqueados por excesso de tentativas, antes de qualquer autenticação. */
public class LoginThrottleFilter extends OncePerRequestFilter {

    private final LoginThrottleService throttle;

    public LoginThrottleFilter(LoginThrottleService throttle) {
        this.throttle = throttle;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equalsIgnoreCase(request.getMethod()) && "/login".equals(request.getServletPath()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String email = request.getParameter("email");
        if (email != null && throttle.isLocked(email, request.getRemoteAddr())) {
            response.sendRedirect(request.getContextPath() + "/login?error=locked");
            return;
        }
        chain.doFilter(request, response);
    }
}
