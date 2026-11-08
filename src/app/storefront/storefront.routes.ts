import { Routes } from '@angular/router';
import { shopperGuard } from '../core/auth/auth.guard';

export const storefrontRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/storefront-home.page').then(page => page.StorefrontHomePage)
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/product-list.page').then(page => page.ProductListPage)
  },
  {
    path: 'products/:key',
    loadComponent: () => import('./pages/product-detail.page').then(page => page.ProductDetailPage)
  },
  // The cart and checkout are for customers; administrators and shop members do not buy.
  {
    path: 'cart',
    canActivate: [shopperGuard],
    loadComponent: () => import('./pages/cart.page').then(page => page.CartPage)
  },
  {
    path: 'checkout',
    canActivate: [shopperGuard],
    loadComponent: () => import('./pages/checkout.page').then(page => page.CheckoutPage)
  },
  {
    path: 'vendors',
    loadComponent: () => import('./pages/vendor-list.page').then(page => page.VendorListPage)
  },
  {
    path: 'vendors/:key',
    loadComponent: () => import('./pages/vendor-detail.page').then(page => page.VendorDetailPage)
  }
];
