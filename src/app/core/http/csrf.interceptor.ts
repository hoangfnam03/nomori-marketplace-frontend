import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { CsrfTokenService } from '../auth/csrf-token.service';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  const csrf = inject(CsrfTokenService);
  const requestWithCredentials = request.clone({ withCredentials: true });

  if (!unsafeMethods.has(request.method) || !request.url.includes('/api/')) {
    return next(requestWithCredentials);
  }

  const sendWithFreshToken = () => csrf.refresh().pipe(
    switchMap(refreshedToken => next(requestWithCredentials.clone({
      setHeaders: { 'X-CSRF-TOKEN': refreshedToken }
    })))
  );

  const token = csrf.currentToken;
  if (!token) {
    return sendWithFreshToken();
  }

  return next(requestWithCredentials.clone({ setHeaders: { 'X-CSRF-TOKEN': token } })).pipe(
    catchError(error => {
      // A rejected antiforgery token is a bare 400 (no field errors) and the action never ran,
      // e.g. the token was issued before sign-in or the session expired. Retry once with a new token.
      if (error?.status === 400 && !error.fieldErrors) {
        return sendWithFreshToken();
      }
      return throwError(() => error);
    })
  );
};
