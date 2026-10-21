package com.burgerpizzahouse.web;

import com.burgerpizzahouse.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserForm {

    @NotBlank(message = "Informe o nome.")
    @Size(min = 2, max = 150, message = "O nome precisa ter entre 2 e 150 caracteres.")
    private String name;

    @NotBlank(message = "Informe o e-mail.")
    @Email(message = "E-mail inválido.")
    @Size(max = 255, message = "O e-mail pode ter no máximo 255 caracteres.")
    private String email;

    private Role role = Role.OPERATOR;

    @NotBlank(message = "Informe a senha provisória.")
    @Size(min = 6, max = 72, message = "A senha precisa ter entre 6 e 72 caracteres.")
    private String password;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
