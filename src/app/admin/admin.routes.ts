import { Routes } from '@angular/router';
import { permissionGuard } from '../core/auth/auth.guard';
import { permissionCodes } from '../core/auth/permission-codes';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(permissionCodes.adminAccess)],
    loadComponent: () => import('./pages/admin-home.page').then(page => page.AdminHomePage)
  }
];
