import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (request, next) => next(request).pipe(
  catchError((error: HttpErrorResponse) => {
    const normalizedError = {
      status: error.status,
      code: error.error?.code ?? null,
      fieldErrors: error.error?.errors ?? undefined,
      traceId: error.headers.get('X-Correlation-ID') ?? error.error?.traceId ?? null,
      message: error.error?.detail ?? error.message
    };

    return throwError(() => normalizedError);
  })
);
