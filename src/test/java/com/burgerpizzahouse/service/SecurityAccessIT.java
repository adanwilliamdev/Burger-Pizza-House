package com.burgerpizzahouse.service;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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

    // ------------------------------------------------------ cabeçalhos de segurança

    @Test
    void loginPageSendsStrictCspAndHardeningHeaders() throws Exception {
        mvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("script-src 'self';"),
                                org.hamcrest.Matchers.containsString("style-src 'self';"),
                                org.hamcrest.Matchers.containsString("frame-ancestors 'none'"),
                                org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("unsafe-inline")))))
                .andExpect(header().string("Referrer-Policy", "same-origin"))
                .andExpect(header().exists("Permissions-Policy"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    void hstsIsSentOnlyOverHttps() throws Exception {
        mvc.perform(get("/login").secure(true))
                .andExpect(header().string("Strict-Transport-Security",
                        org.hamcrest.Matchers.containsString("max-age=31536000")));
    }

    @Test
    void apiResponsesHaveLockedDownCsp() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void swaggerGetsRelaxedCspOnlyForDocs() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(header().string("Content-Security-Policy",
                        org.hamcrest.Matchers.containsString("'unsafe-inline'")));
    }

    // ------------------------------------------------------------ swagger

    @Test
    void swaggerDocsWithoutSessionRedirectsToLogin() throws Exception {
        mvc.perform(get("/docs")).andExpect(status().isFound()).andExpect(redirectedUrlPattern("**/login"));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isFound()).andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void swaggerDocsAreForbiddenForNonAdmins() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void apiDocsAreAvailableForAdmins() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
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
