import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'storefront' },
	{
		path: '',
		loadComponent: () => import('./layout/app-shell/app-shell.component').then(page => page.AppShellComponent),
		children: [
			{
				path: 'storefront',
				loadChildren: () => import('./storefront/storefront.routes').then(route => route.storefrontRoutes)
			},
			{
				path: 'admin',
				loadChildren: () => import('./admin/admin.routes').then(route => route.adminRoutes)
			}
		]
	},
	{ path: '**', redirectTo: 'storefront' }
];
