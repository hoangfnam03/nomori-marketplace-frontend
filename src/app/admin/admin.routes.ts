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
    path: 'currencies',
    canActivate: [permissionGuard(permissionCodes.settingsManage)],
    loadComponent: () => import('./pages/admin-currencies.page').then(page => page.AdminCurrenciesPage)
  },
  {
    path: 'countries',
    canActivate: [permissionGuard(permissionCodes.settingsManage)],
    loadComponent: () => import('./pages/admin-countries.page').then(page => page.AdminCountriesPage)
  },
  {
    path: 'payments',
    canActivate: [permissionGuard(permissionCodes.paymentsManage)],
    loadComponent: () => import('./pages/admin-payments.page').then(page => page.AdminPaymentsPage)
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
