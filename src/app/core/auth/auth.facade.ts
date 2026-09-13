import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthFormError, AuthSession } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authApi = inject(AuthApiService);
  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private sessionRequest$ = this.authApi.getSession().pipe(
    tap(session => this.sessionState.set(session)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly session = this.sessionState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState()?.isAuthenticated ?? false);

  register(request: { email: string; password: string }) {
    return this.run(request, () => this.authApi.register(request));
  }

  login(request: { email: string; password: string; rememberMe: boolean }) {
    return this.run(request, () => this.authApi.login(request).pipe(
      tap(() => this.refreshSession())
    ));
  }

  logout() {
    return this.run(undefined, () => this.authApi.logout().pipe(tap(() => this.clearSession())));
  }

  getPermissions() {
    return this.authApi.getPermissions();
  }

  changePassword(request: { currentPassword: string; newPassword: string }) {
    return this.run(request, () => this.authApi.changePassword(request));
  }

  forgotPassword(email: string) {
    return this.run({ email }, () => this.authApi.forgotPassword({ email }));
  }

  resetPassword(request: { token: string; newPassword: string }) {
    return this.run(request, () => this.authApi.resetPassword(request));
  }

  loadSession() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.sessionRequest$.pipe(
      finalize(() => this.loadingState.set(false))
    );
  }

  refreshSession() {
    this.sessionRequest$ = this.authApi.getSession().pipe(
      tap(session => this.sessionState.set(session)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.sessionRequest$.subscribe();
  }

  clearSession() {
    const anonymousSession: AuthSession = { isAuthenticated: false, customerId: null, email: null };
    this.sessionState.set(anonymousSession);
    this.sessionRequest$ = of(anonymousSession);
  }

  private run<TRequest, TResult>(request: TRequest, action: () => Observable<TResult>) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return action().pipe(
      catchError(error => {
        const normalizedError: AuthFormError = {
          status: error.status ?? 0,
          message: this.getErrorMessage(error),
          code: error.code ?? null
        };
        this.errorState.set(normalizedError.message);
        return throwError(() => normalizedError);
      }),
      finalize(() => this.loadingState.set(false))
    );
  }

  private getErrorMessage(error: { status?: number; message?: string; code?: string | null }) {
    if (error.status === 401) return 'auth.invalid_credentials';
    if (error.status === 409) return 'auth.email_already_exists';
    if (error.status === 400) return 'auth.invalid_request';
    return error.message ?? 'common.unexpected_error';
  }
}
