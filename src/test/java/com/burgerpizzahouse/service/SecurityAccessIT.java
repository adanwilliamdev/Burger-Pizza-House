package com.burgerpizzahouse.service;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

/** Quem pode (e quem não pode) acessar o quê, nas duas cadeias de segurança (API/JWT e web/sessão). */
@SpringBootTest
@AutoConfigureMockMvc
class SecurityAccessIT {

    @Autowired
    MockMvc mvc;

    // ------------------------------------------------------------------ API

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void apiWithoutTokenIs401() throws Exception {
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    void apiWithGarbageTokenIs401() throws Exception {
        mvc.perform(get("/api/orders").header("Authorization", "Bearer isto-nao-e-um-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void operatorCannotListUsersViaApi() throws Exception {
        mvc.perform(get("/api/users")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerCannotDeleteProductsViaApi() throws Exception {
        mvc.perform(delete("/api/products/1")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanListUsersViaApi() throws Exception {
        mvc.perform(get("/api/users")).andExpect(status().isOk());
    }

    // ------------------------------------------------------------------ web

    @Test
    void webWithoutSessionRedirectsToLogin() throws Exception {
        mvc.perform(get("/dashboard")).andExpect(status().isFound()).andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void operatorCannotOpenUsersPage() throws Exception {
        mvc.perform(get("/users")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void operatorCannotOpenNewIngredientForm() throws Exception {
        mvc.perform(get("/ingredients/new")).andExpect(status().isForbidden());
    }

    @Test
    void loginFormRejectsPostWithoutCsrfToken() throws Exception {
        mvc.perform(post("/login").param("email", "a@b.com").param("password", "x"))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------ actuator

    @Test
    void actuatorWithoutSessionRedirectsToLogin() throws Exception {
        mvc.perform(get("/actuator/metrics")).andExpect(status().isFound()).andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void actuatorIsForbiddenForNonAdmins() throws Exception {
        mvc.perform(get("/actuator/metrics")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void actuatorHealthIsAvailableForAdmins() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
}
