import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'storefront' },
	{
		path: '',
		loadComponent: () => import('./layout/app-shell/app-shell.component').then(page => page.AppShellComponent),
		children: [
			{
				path: 'auth',
				loadChildren: () => import('./auth/auth.routes').then(route => route.authRoutes)
			},
			{
				path: 'storefront',
				loadChildren: () => import('./storefront/storefront.routes').then(route => route.storefrontRoutes)
			},
			{
				path: 'customer',
				loadChildren: () => import('./customer/customer.routes').then(route => route.customerRoutes)
			},
			{
				path: 'admin',
				loadChildren: () => import('./admin/admin.routes').then(route => route.adminRoutes)
			}
		]
	},
	{ path: '**', redirectTo: 'storefront' }
];
