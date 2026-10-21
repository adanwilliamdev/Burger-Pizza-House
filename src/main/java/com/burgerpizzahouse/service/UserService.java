package com.burgerpizzahouse.service;

import com.burgerpizzahouse.domain.Role;
import com.burgerpizzahouse.domain.User;
import com.burgerpizzahouse.dto.UserDtos.UserCreateRequest;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import com.burgerpizzahouse.repository.UserRepository;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return users.findAllByOrderByNameAsc().stream().map(Mappers::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long id) {
        return users.findById(id).map(Mappers::toResponse)
                .orElseThrow(() -> BusinessException.notFound("Usuário não encontrado."));
    }

    /** Criação de usuários — restrita a administradores (verificado na camada web). */
    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String email = request.email().strip().toLowerCase();
        String name = request.name().strip();
        if (name.length() < 2) {
            throw new BusinessException("Nome muito curto");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw BusinessException.conflict("Já existe um usuário com este e-mail.");
        }
        Role role = request.role() == null ? Role.OPERATOR : request.role();
        User user = new User(name, email, encoder.encode(request.password()), role);
        users.save(user);
        return Mappers.toResponse(user);
    }
}
