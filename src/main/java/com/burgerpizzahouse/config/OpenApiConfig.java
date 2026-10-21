package com.burgerpizzahouse.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/** Documentação interativa da API em /docs (botão "Authorize" aceita o access token). */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Burger & Pizza House — API",
                description = "ERP para hamburgueria e pizzaria: pedidos, catálogo, estoque e dashboard.",
                version = "1.0.0"),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
