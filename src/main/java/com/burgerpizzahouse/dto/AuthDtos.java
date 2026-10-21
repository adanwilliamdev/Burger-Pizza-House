package com.burgerpizzahouse.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Informe o e-mail.") @Email(message = "E-mail inválido.") String email,
            @NotBlank(message = "Informe a senha.") String password) {
    }

    public record RefreshRequest(@NotBlank(message = "Informe o refresh token.") String refreshToken) {
    }

    public record TokenPair(String accessToken, String refreshToken, String tokenType) {
        public static TokenPair bearer(String accessToken, String refreshToken) {
            return new TokenPair(accessToken, refreshToken, "bearer");
        }
    }

    public record LoginResponse(String accessToken, String refreshToken, String tokenType,
                                UserDtos.UserResponse user) {
    }
}
