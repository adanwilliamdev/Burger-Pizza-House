package com.burgerpizzahouse.web;

import com.burgerpizzahouse.dto.UserDtos.UserCreateRequest;
import com.burgerpizzahouse.dto.UserDtos.UserResponse;
import com.burgerpizzahouse.service.BusinessException;
import com.burgerpizzahouse.service.UserService;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/** Gestão de usuários — restrita a administradores. */
@Controller
@PreAuthorize("hasRole('ADMIN')")
public class UserViewController {

    private final UserService users;

    public UserViewController(UserService users) {
        this.users = users;
    }

    @GetMapping("/users")
    public String list(Model model) {
        model.addAttribute("users", users.list());
        return "users/list";
    }

    @GetMapping("/users/new")
    public String newForm(Model model) {
        model.addAttribute("form", new UserForm());
        return "users/form";
    }

    @PostMapping("/users")
    public String create(@Valid @ModelAttribute("form") UserForm form, BindingResult result, Model model,
                         RedirectAttributes redirect) {
        List<String> errors = new ArrayList<>();
        result.getAllErrors().forEach(e -> errors.add(e.getDefaultMessage()));
        if (errors.isEmpty()) {
            try {
                UserResponse created = users.create(
                        new UserCreateRequest(form.getName(), form.getEmail(), form.getRole(), form.getPassword()));
                redirect.addFlashAttribute("success", "Usuário \"" + created.name() + "\" criado com sucesso.");
                return "redirect:/users";
            } catch (BusinessException e) {
                errors.add(e.getMessage());
            }
        }
        form.setPassword(null);
        model.addAttribute("errors", errors);
        return "users/form";
    }
}
