import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const customerRoutes: Routes = [
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile.page').then(page => page.ProfilePage) },
  { path: 'become-vendor', canActivate: [authGuard], loadComponent: () => import('./pages/become-vendor.page').then(page => page.BecomeVendorPage) },
  { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./pages/account-data.page').then(page => page.AccountDataPage) }
];
