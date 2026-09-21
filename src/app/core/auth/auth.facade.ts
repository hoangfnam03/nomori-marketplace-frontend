import { computed, inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthFormError, AuthSession } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authApi = inject(AuthApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly anonymousSession: AuthSession = { isAuthenticated: false, customerId: null, email: null, emailVerified: null, emailOtpEnabled: null };
  private readonly sessionState = signal<AuthSession | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private sessionRequest$ = this.createSessionRequest();

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
    return this.run(request, () => this.authApi.changePassword(request).pipe(tap(() => this.clearSession())));
  }

  forgotPassword(email: string) {
    return this.run({ email }, () => this.authApi.forgotPassword({ email }));
  }

  resetPassword(request: { token: string; newPassword: string }) {
    return this.run(request, () => this.authApi.resetPassword(request));
  }

  sendEmailVerification(email: string) {
    return this.run({ email }, () => this.authApi.sendEmailVerification({ email }));
  }

  verifyEmail(token: string) {
    return this.run({ token }, () => this.authApi.verifyEmail(token));
  }

  verifyLoginOtp(request: { challengeId: string; code: string; rememberMe: boolean }) {
    return this.run(request, () => this.authApi.verifyLoginOtp(request).pipe(tap(() => this.refreshSession())));
  }

  setupOtp() {
    return this.run(undefined, () => this.authApi.setupOtp());
  }

  enableOtp(request: { challengeId: string; code: string }) {
    return this.run(request, () => this.authApi.enableOtp(request).pipe(tap(() => this.refreshSession())));
  }

  disableOtp() {
    return this.run(undefined, () => this.authApi.disableOtp().pipe(tap(() => this.refreshSession())));
  }

  loadSession() {
    if (!isPlatformBrowser(this.platformId)) {
      this.sessionState.set(this.anonymousSession);
      return of(this.anonymousSession);
    }

    this.loadingState.set(true);
    this.errorState.set(null);
    return this.sessionRequest$.pipe(
      finalize(() => this.loadingState.set(false))
    );
  }

  refreshSession() {
    if (!isPlatformBrowser(this.platformId)) {
      this.sessionState.set(this.anonymousSession);
      this.sessionRequest$ = of(this.anonymousSession);
      return;
    }

    this.sessionRequest$ = this.authApi.getSession().pipe(
      tap(session => this.sessionState.set(session)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.sessionRequest$.subscribe();
  }

  clearSession() {
    this.sessionState.set(this.anonymousSession);
    this.sessionRequest$ = of(this.anonymousSession);
  }

  private createSessionRequest() {
    if (!isPlatformBrowser(this.platformId))
      return of(this.anonymousSession);

    return this.authApi.getSession().pipe(
      tap(session => this.sessionState.set(session)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private run<TRequest, TResult>(request: TRequest, action: () => Observable<TResult>) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return action().pipe(
      catchError(error => {
        const normalizedError: AuthFormError = {
          status: error.status ?? 0,
          message: this.getErrorMessage(error),
          code: error.code ?? null,
          fieldErrors: error.fieldErrors ?? undefined
        };
        this.errorState.set(normalizedError.message);
        return throwError(() => normalizedError);
      }),
      finalize(() => this.loadingState.set(false))
    );
  }

  private getErrorMessage(error: { status?: number; message?: string; code?: string | null }) {
    if (error.status === 401) return 'auth.invalid_credentials';
    if (error.status === 403 && error.message === 'auth.email_not_verified') return 'Please verify your email before signing in.';
    if (error.status === 403) return 'auth.forbidden';
    if (error.status === 409) return 'auth.email_already_exists';
    if (error.code === 'auth.password_policy') return 'Password does not meet the password policy.';
    if (error.code === 'auth.password_recently_used') return 'Choose a password that has not been used recently.';
    if (error.status === 400) return 'auth.invalid_request';
    return error.message ?? 'common.unexpected_error';
  }
}
