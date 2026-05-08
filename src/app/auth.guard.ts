import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = await authService.isReady();

  if (isAuth) {
    return true;
  }

  // Redirecionar para o login se não estiver autenticado
  router.navigate(['/login']);
  return false;
};
