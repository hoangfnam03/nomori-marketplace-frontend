import { Routes } from '@angular/router';
import { permissionGuard } from '../core/auth/auth.guard';
import { permissionCodes } from '../core/auth/permission-codes';

export const vendorRoutes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-portal.page').then(page => page.VendorPortalPage)
  },
  {
    path: 'products',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-products.page').then(page => page.VendorProductsPage)
  },
  {
    path: 'products/:id/details',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-product-details.page').then(page => page.VendorProductDetailsPage)
  },
  {
    path: 'settings',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-settings.page').then(page => page.VendorSettingsPage)
  },
  {
    path: 'orders',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-orders.page').then(page => page.VendorOrdersPage)
  },
  {
    path: 'orders/:id',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-order-detail.page').then(page => page.VendorOrderDetailPage)
  },
  {
    path: 'members',
    canActivate: [permissionGuard(permissionCodes.vendorPortal)],
    loadComponent: () => import('./pages/vendor-members.page').then(page => page.VendorMembersPage)
  }
];
