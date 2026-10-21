package com.burgerpizzahouse.dto;

import com.burgerpizzahouse.domain.Role;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(
            Long id,
            String name,
            String email,
            Role role,
            @JsonProperty("is_active") boolean isActive,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record UserCreateRequest(
            @NotBlank(message = "Informe o nome.") @Size(max = 150) String name,
            @NotBlank(message = "Informe o e-mail.") @Email(message = "E-mail inválido.") @Size(max = 255) String email,
            Role role,
            @NotNull(message = "Informe a senha.") @Size(min = 6, max = 72, message = "A senha precisa ter entre 6 e 72 caracteres.")
            String password) {
    }
}
