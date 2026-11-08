import { effect, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { AuthFacade } from './auth.facade';
import { AuthSession } from './auth.models';
import { permissionCodes } from './permission-codes';

/**
 * Whether the signed-in account may shop. Administrators and shop members run the marketplace, so they do not buy: no cart, no checkout,
 * no orders or returns of their own, no address book. They keep their account and security pages. This is a rule of the screens only.
 */
@Injectable({ providedIn: 'root' })
export class ShopperAccessService {
  private readonly auth = inject(AuthFacade);

  /** True for an administrator or a shop member; false for a customer and for a guest. */
  readonly isStaff = signal(false);
  private loadedFor: string | null = null;

  constructor() {
    // Follows the session: another account signing in, or a shop membership being approved, changes the answer.
    effect(() => {
      const session = this.auth.session();
      const key = session?.isAuthenticated ? `${session.customerId}:${session.vendorId ?? ''}` : null;
      if (key === this.loadedFor) return;
      this.loadedFor = key;
      if (!session || key === null) { this.isStaff.set(false); return; }
      this.check(session).subscribe(staff => this.isStaff.set(staff));
    }, { allowSignalWrites: true });
  }

  /** The answer for the current session, asking the server when it is not known yet (route guards). */
  staff(): Observable<boolean> {
    return this.auth.loadSession().pipe(switchMap(session => session.isAuthenticated ? this.check(session) : of(false)));
  }

  private check(session: AuthSession): Observable<boolean> {
    if (session.vendorId) return of(true);
    // Accounts without permissions.read get 403: they are customers.
    return this.auth.getPermissions().pipe(
      map(response => response.permissions.includes(permissionCodes.adminAccess)),
      catchError(() => of(false))
    );
  }
}
