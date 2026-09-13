import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/admin-home.page').then(page => page.AdminHomePage)
  }
];
