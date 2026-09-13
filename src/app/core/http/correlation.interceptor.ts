import { HttpInterceptorFn } from '@angular/common/http';

export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  const correlationId = crypto.randomUUID();
  return next(request.clone({ setHeaders: { 'X-Correlation-ID': correlationId } }));
};
