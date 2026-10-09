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
				path: 'vendor',
				loadChildren: () => import('./vendor/vendor.routes').then(route => route.vendorRoutes)
			},
			{
				path: 'admin',
				loadChildren: () => import('./admin/admin.routes').then(route => route.adminRoutes)
			}
		]
	},
	// The page of the test gateway. A real gateway has its own site; this one only works where the test gateway is configured.
	{
		path: 'payments/sandbox/:reference',
		loadComponent: () => import('./payments/sandbox-gateway.page').then(page => page.SandboxGatewayPage)
	},
	{ path: '**', redirectTo: 'storefront' }
];
