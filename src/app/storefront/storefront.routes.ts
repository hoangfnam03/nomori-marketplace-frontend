import { Routes } from '@angular/router';

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
    path: 'products/:id',
    loadComponent: () => import('./pages/product-detail.page').then(page => page.ProductDetailPage)
  },
  {
    path: 'vendors',
    loadComponent: () => import('./pages/vendor-list.page').then(page => page.VendorListPage)
  },
  {
    path: 'vendors/:id',
    loadComponent: () => import('./pages/vendor-detail.page').then(page => page.VendorDetailPage)
  }
];
