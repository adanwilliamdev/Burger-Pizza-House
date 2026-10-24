package com.burgerpizzahouse.service;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burgerpizzahouse.config.AppProperties;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Fluxo de autenticação da API: login, /me, rotação de refresh token, logout e bloqueio por tentativas. */
@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    AppProperties props;
    @Value("${app.seed.admin-password}")
    String adminPassword;

    /** IP aleatório por teste: os contadores do Redis não vazam entre testes nem entre execuções seguidas. */
    private static String randomIp() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return "10." + r.nextInt(1, 255) + "." + r.nextInt(1, 255) + "." + r.nextInt(1, 255);
    }

    private static RequestPostProcessor from(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private ResultActions login(String email, String password, String ip) throws Exception {
        return mvc.perform(post("/api/auth/login").with(from(ip)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    private ResultActions refresh(String refreshToken) throws Exception {
        return mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refresh_token\":\"" + refreshToken + "\"}"));
    }

    private static String read(ResultActions result, String path) throws Exception {
        return JsonPath.<String>read(result.andReturn().getResponse().getContentAsString(), path);
    }

    @Test
    void loginReturnsTokensAndMeWorks() throws Exception {
        ResultActions ok = login(SeedService.ADMIN_EMAIL, adminPassword, randomIp()).andExpect(status().isOk());
        String access = read(ok, "$.access_token");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(SeedService.ADMIN_EMAIL));
    }

    @Test
    void wrongPasswordIs401() throws Exception {
        login(SeedService.ADMIN_EMAIL, "senha-errada-123", randomIp()).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesAndTheOldTokenStopsWorking() throws Exception {
        String oldRefresh = read(login(SeedService.ADMIN_EMAIL, adminPassword, randomIp()), "$.refresh_token");
        ResultActions rotated = refresh(oldRefresh).andExpect(status().isOk());
        String newRefresh = read(rotated, "$.refresh_token");
        refresh(oldRefresh).andExpect(status().isUnauthorized());
        refresh(newRefresh).andExpect(status().isOk());
    }

    @Test
    void logoutRevokesTheRefreshToken() throws Exception {
        String refreshToken = read(login(SeedService.ADMIN_EMAIL, adminPassword, randomIp()), "$.refresh_token");
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refresh_token\":\"" + refreshToken + "\"}")).andExpect(status().isNoContent());
        refresh(refreshToken).andExpect(status().isUnauthorized());
    }

    @Test
    void accessTokenIsNotAcceptedAsRefreshToken() throws Exception {
        String access = read(login(SeedService.ADMIN_EMAIL, adminPassword, randomIp()), "$.access_token");
        refresh(access).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenIsNotAcceptedAsAccessToken() throws Exception {
        String refreshToken = read(login(SeedService.ADMIN_EMAIL, adminPassword, randomIp()), "$.refresh_token");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedFailuresLockOnlyThatEmailAndIp() throws Exception {
        String email = "forca-bruta-" + UUID.randomUUID() + "@example.com";
        String attackerIp = randomIp();
        for (int i = 0; i < props.login().maxAttempts(); i++) {
            login(email, "errada", attackerIp).andExpect(status().isUnauthorized());
        }
        login(email, "errada", attackerIp).andExpect(status().isTooManyRequests());
        // outro IP não é afetado pelo bloqueio (ninguém bloqueia a conta de terceiros de outro lugar)
        login(email, "errada", randomIp()).andExpect(status().isUnauthorized());
    }
}
