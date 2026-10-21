package com.burgerpizzahouse.web;

import com.burgerpizzahouse.security.AppUserDetails;
import com.burgerpizzahouse.service.UserService;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthViewController {

    private final UserService users;

    public AuthViewController(UserService users) {
        this.users = users;
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }

    @GetMapping("/login")
    public String login(Authentication authentication,
                        @RequestParam(required = false) String error,
                        @RequestParam(required = false) String logout,
                        Model model) {
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return "redirect:/dashboard";
        }
        if (error != null) {
            model.addAttribute("errorMessage", switch (error) {
                case "locked" -> "Muitas tentativas de login. Tente novamente em alguns minutos.";
                case "inactive" -> "Esta conta está inativa.";
                default -> "Credenciais inválidas.";
            });
        }
        model.addAttribute("loggedOut", logout != null);
        return "login";
    }

    @GetMapping("/me")
    public String me(@AuthenticationPrincipal AppUserDetails me, Model model) {
        model.addAttribute("profile", users.get(me.getId()));
        return "me";
    }
}
