import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { AuthApiService } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class CsrfTokenService {
  private readonly authApi = inject(AuthApiService);
  private readonly token = signal<string | null>(null);

  get currentToken(): string | null {
    return this.token();
  }

  refresh(): Observable<string> {
    return this.authApi.getCsrfToken().pipe(
      tap(response => this.token.set(response.token)),
      map(response => response.token)
    );
  }

  /** Antiforgery tokens are bound to the signed-in user, so drop the cached one whenever the identity changes. */
  clear() {
    this.token.set(null);
  }
}
