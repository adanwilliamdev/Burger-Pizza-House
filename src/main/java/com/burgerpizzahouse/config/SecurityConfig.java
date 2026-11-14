package com.burgerpizzahouse.config;

import com.burgerpizzahouse.repository.UserRepository;
import com.burgerpizzahouse.security.ApiSecurityHandlers;
import com.burgerpizzahouse.security.JwtAuthenticationFilter;
import com.burgerpizzahouse.security.JwtService;
import com.burgerpizzahouse.security.LoginHandlers;
import com.burgerpizzahouse.security.LoginThrottleFilter;
import com.burgerpizzahouse.service.LoginThrottleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.HeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Duas cadeias de segurança:
 * <ul>
 *   <li>{@code /api/**}: API REST sem sessão, autenticada por JWT (Bearer);</li>
 *   <li>demais rotas: interface web com login por formulário, sessão e proteção CSRF.</li>
 * </ul>
 * Ambas enviam CSP, Referrer-Policy, Permissions-Policy e HSTS (este só em requisições HTTPS; atrás de proxy
 * depende de {@code server.forward-headers-strategy}). X-Content-Type-Options, X-Frame-Options e Cache-Control
 * já vêm dos padrões do Spring Security.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * CSP da interface web: tudo só da própria origem, sem script/estilo inline (os templates não os usam; os
     * comportamentos ficam em /js/app.js e os estilos em /css/app.css). {@code img-src data:} cobre ícones embutidos.
     */
    static final String WEB_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
            + "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; "
            + "frame-ancestors 'none'";

    /** Swagger UI (só ADMIN, e desligado por padrão em produção) precisa de script/estilo inline. */
    static final String DOCS_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; "
            + "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; "
            + "object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

    /** A API só devolve JSON: nada precisa ser carregado nem embutido. */
    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'";

    private static final String PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=()";

    private static boolean isDocsPath(String path) {
        return path.equals("/docs") || path.startsWith("/docs/") || path.startsWith("/swagger-ui/")
                || path.startsWith("/v3/api-docs");
    }

    private static HeaderWriter webCsp() {
        return (request, response) -> response.setHeader("Content-Security-Policy",
                isDocsPath(request.getRequestURI().substring(request.getContextPath().length())) ? DOCS_CSP : WEB_CSP);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.corsOriginList());
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    @Order(1)
    SecurityFilterChain apiChain(HttpSecurity http, JwtService jwt, UserRepository users, ObjectMapper mapper,
                                 @Qualifier("corsConfigurationSource") CorsConfigurationSource cors) throws Exception {
        ApiSecurityHandlers handlers = new ApiSecurityHandlers(mapper);
        http.securityMatcher("/api/**")
                .csrf(csrf -> csrf.disable())
                .cors(c -> c.configurationSource(cors))
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives(API_CSP))
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
                        .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(Duration.ofDays(365).toSeconds())
                                .includeSubDomains(true))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY)))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/health", "/api/health/**",
                                "/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
                .addFilterBefore(new JwtAuthenticationFilter(jwt, users), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain webChain(HttpSecurity http, LoginThrottleService throttle) throws Exception {
        http.headers(h -> h
                        .addHeaderWriter(webCsp())
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.SAME_ORIGIN))
                        .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(Duration.ofDays(365).toSeconds())
                                .includeSubDomains(true))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY)))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/login", "/error", "/css/**", "/js/**", "/favicon.svg").permitAll()
                        .requestMatchers("/docs", "/docs/**", "/swagger-ui/**", "/v3/api-docs/**").hasRole("ADMIN")
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .formLogin(f -> f
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .successHandler(new LoginHandlers.Success(throttle))
                        .failureHandler(new LoginHandlers.Failure(throttle))
                        .permitAll())
                .logout(l -> l
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .addFilterBefore(new LoginThrottleFilter(throttle), UsernamePasswordAuthenticationFilter.class)
                .csrf(Customizer.withDefaults());
        return http.build();
    }
}
