package com.burgerpizzahouse.api;

import com.burgerpizzahouse.dto.UserDtos.UserCreateRequest;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import com.burgerpizzahouse.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Tag(name = "users")
@PreAuthorize("hasRole('ADMIN')")
public class UserApiController {

    private final UserService users;

    public UserApiController(UserService users) {
        this.users = users;
    }

    @GetMapping
    public List<UserResponse> list() {
        return users.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
        return users.create(request);
    }
}
