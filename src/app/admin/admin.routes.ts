import { Routes } from '@angular/router';
import { permissionGuard } from '../core/auth/auth.guard';
import { permissionCodes } from '../core/auth/permission-codes';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(permissionCodes.adminAccess)],
    loadComponent: () => import('./pages/admin-home.page').then(page => page.AdminHomePage)
  },
  {
    path: 'catalog',
    canActivate: [permissionGuard(permissionCodes.catalogManage)],
    loadComponent: () => import('./pages/admin-catalog.page').then(page => page.AdminCatalogPage)
  },
  {
    path: 'vendors',
    canActivate: [permissionGuard(permissionCodes.vendorManage)],
    loadComponent: () => import('./pages/admin-vendors.page').then(page => page.AdminVendorsPage)
  },
  {
    path: 'vendor-applications',
    canActivate: [permissionGuard(permissionCodes.vendorManage)],
    loadComponent: () => import('./pages/admin-vendor-applications.page').then(page => page.AdminVendorApplicationsPage)
  },
  {
    path: 'attributes',
    canActivate: [permissionGuard(permissionCodes.catalogManage)],
    loadComponent: () => import('./pages/admin-attribute-specs.page').then(page => page.AdminAttributeSpecsPage)
  },
  {
    path: 'spec-attributes',
    canActivate: [permissionGuard(permissionCodes.catalogManage)],
    loadComponent: () => import('./pages/admin-spec-attrs.page').then(page => page.AdminSpecAttrsPage)
  }
];
