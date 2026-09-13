import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { CsrfTokenService } from '../auth/csrf-token.service';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  const csrf = inject(CsrfTokenService);
  const requestWithCredentials = request.clone({ withCredentials: true });

  if (!unsafeMethods.has(request.method) || !request.url.includes('/api/')) {
    return next(requestWithCredentials);
  }

  const token = csrf.currentToken;
  if (token) {
    return next(requestWithCredentials.clone({ setHeaders: { 'X-CSRF-TOKEN': token } }));
  }

  return csrf.refresh().pipe(
    switchMap(refreshedToken => next(requestWithCredentials.clone({
      setHeaders: { 'X-CSRF-TOKEN': refreshedToken }
    })))
  );
};
