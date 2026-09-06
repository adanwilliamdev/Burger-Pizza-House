import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Equivalente ao interceptor do axios em services/api.ts:
 * - Garante que o cookie httpOnly de autenticação seja enviado em toda
 *   requisição (`withCredentials`), necessário porque o token JWT vive
 *   num cookie setado pelo backend (ver auth.controller.ts).
 * - Em caso de 401, redireciona para /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const withCreds = req.clone({ withCredentials: true });

  return next(withCreds).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/me')) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
