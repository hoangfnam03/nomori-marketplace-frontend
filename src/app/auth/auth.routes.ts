import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then(page => page.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register.page').then(page => page.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password.page').then(page => page.ForgotPasswordPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password.page').then(page => page.ResetPasswordPage) },
  { path: 'account', loadComponent: () => import('./pages/account.page').then(page => page.AccountPage) }
];
