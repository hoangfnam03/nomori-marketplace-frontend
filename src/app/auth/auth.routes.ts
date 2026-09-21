import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const authRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then(page => page.LoginPage) },
  { path: 'login-otp', loadComponent: () => import('./pages/login-otp.page').then(page => page.LoginOtpPage) },
  { path: 'register', loadComponent: () => import('./pages/register.page').then(page => page.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password.page').then(page => page.ForgotPasswordPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password.page').then(page => page.ResetPasswordPage) },
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email.page').then(page => page.VerifyEmailPage) },
  { path: 'forbidden', loadComponent: () => import('./pages/forbidden.page').then(page => page.ForbiddenPage) },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./pages/account.page').then(page => page.AccountPage) }
];
