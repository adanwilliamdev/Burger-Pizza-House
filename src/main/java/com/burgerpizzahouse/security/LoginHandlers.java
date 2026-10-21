package com.burgerpizzahouse.security;

import com.burgerpizzahouse.service.LoginThrottleService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;

/** Sucesso e falha do login da interface web (zera / conta as tentativas de força bruta). */
public final class LoginHandlers {

    private LoginHandlers() {
    }

    public static class Success extends SavedRequestAwareAuthenticationSuccessHandler {

        private final LoginThrottleService throttle;

        public Success(LoginThrottleService throttle) {
            this.throttle = throttle;
            setDefaultTargetUrl("/dashboard");
        }

        @Override
        public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                            Authentication authentication) throws IOException, ServletException {
            throttle.clear(authentication.getName());
            super.onAuthenticationSuccess(request, response, authentication);
        }
    }

    public static class Failure implements AuthenticationFailureHandler {

        private final LoginThrottleService throttle;

        public Failure(LoginThrottleService throttle) {
            this.throttle = throttle;
        }

        @Override
        public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                            AuthenticationException exception) throws IOException {
            String reason = "credentials";
            if (exception instanceof DisabledException) {
                reason = "inactive";
            } else if (exception instanceof BadCredentialsException) {
                String email = request.getParameter("email");
                if (email != null) {
                    throttle.registerFailure(email);
                }
            }
            response.sendRedirect(request.getContextPath() + "/login?error=" + reason);
        }
    }
}
