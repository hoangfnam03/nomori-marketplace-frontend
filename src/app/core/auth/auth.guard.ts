import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthFacade } from './auth.facade';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthFacade);
  const router = inject(Router);

  return auth.loadSession().pipe(
    map(session => session.isAuthenticated
      ? true
      : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }))
  );
};

export function permissionGuard(permissionCode: string): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthFacade);
    const router = inject(Router);

    return auth.loadSession().pipe(
      switchMap(session => {
        if (!session.isAuthenticated) {
          return of(router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }));
        }

        return auth.getPermissions().pipe(
          map(response => response.permissions.includes(permissionCode)
            ? true
            : router.createUrlTree(['/auth/forbidden'], { queryParams: { returnUrl: state.url } })),
          catchError(error => of(error.status === 403
            ? router.createUrlTree(['/auth/forbidden'], { queryParams: { returnUrl: state.url } })
            : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })))
        );
      })
    );
  };
}
