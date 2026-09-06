import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guarda de rota — equivalente ao ProtectedRoute.tsx do frontend em React.
 *
 * Como `AuthService.fetchUser()` já é aguardado por um `provideAppInitializer`
 * antes do Angular sequer montar a aplicação (ver app.config.ts), quando este
 * guard roda o estado de autenticação já está resolvido — não há uma tela de
 * loading intermediária "vazando" o layout para quem não está logado, como
 * podia acontecer no app original.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { from: state.url } });
};

/** Impede quem já está logado de ver a tela de login. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
