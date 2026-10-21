package com.burgerpizzahouse.api;

import com.burgerpizzahouse.dto.AuthDtos.LoginRequest;
import com.burgerpizzahouse.dto.AuthDtos.LoginResponse;
import com.burgerpizzahouse.dto.AuthDtos.RefreshRequest;
import com.burgerpizzahouse.dto.AuthDtos.TokenPair;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "auth")
public class AuthApiController {

    private final AuthService auth;

    public AuthApiController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping("/refresh")
    public TokenPair refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        auth.logout(request.refreshToken());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AppUserDetails me) {
        return auth.me(me.getId());
    }
}
