import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const customerRoutes: Routes = [
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile.page').then(page => page.ProfilePage) },
  { path: 'become-vendor', canActivate: [authGuard], loadComponent: () => import('./pages/become-vendor.page').then(page => page.BecomeVendorPage) },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./pages/orders.page').then(page => page.OrdersPage) },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./pages/order-detail.page').then(page => page.OrderDetailPage) },
  { path: 'returns', canActivate: [authGuard], loadComponent: () => import('./pages/returns.page').then(page => page.ReturnsPage) },
  { path: 'returns/new/:orderId/:shopOrderId', canActivate: [authGuard], loadComponent: () => import('./pages/return-new.page').then(page => page.ReturnNewPage) },
  { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./pages/account-data.page').then(page => page.AccountDataPage) }
];
