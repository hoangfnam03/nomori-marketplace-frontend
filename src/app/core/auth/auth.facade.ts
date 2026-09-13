import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, of, shareReplay, tap } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthSession } from './auth.models';

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

  loadSession() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.sessionRequest$.pipe(
      finalize(() => this.loadingState.set(false))
    );
  }

  clearSession() {
    const anonymousSession: AuthSession = { isAuthenticated: false, customerId: null, email: null };
    this.sessionState.set(anonymousSession);
    this.sessionRequest$ = of(anonymousSession);
  }
}
