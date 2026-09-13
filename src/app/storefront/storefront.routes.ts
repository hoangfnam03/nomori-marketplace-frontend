import { Routes } from '@angular/router';

export const storefrontRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/storefront-home.page').then(page => page.StorefrontHomePage)
  }
];
