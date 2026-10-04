import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

/** Signed-in customers only (customer-orders-prd.md, FR-01): guests are sent to sign in and come back here. */
export const checkoutRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/checkout.page').then(page => page.CheckoutPage)
  },
  {
    path: 'success/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order-success.page').then(page => page.OrderSuccessPage)
  }
];
