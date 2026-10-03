import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { translate } from '@jsverse/transloco';
import { catchError, map, Observable, of } from 'rxjs';
import { AuthFacade } from '../auth/auth.facade';
import { vendorErrorMessage } from '../vendors/vendor-errors';
import { CartApiService } from './cart-api.service';
import { CartView } from './cart.models';

/** What happened when the customer pressed "Add to cart". */
export type CartAddOutcome =
  | { kind: 'added'; view: CartView }
  /** A guest was sent to sign in and comes back to the page they were on. */
  | { kind: 'login' }
  /** The product has variants: the customer has to choose on its page. */
  | { kind: 'choose-options' }
  | { kind: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(CartApiService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Units in the cart, for the header. Zero for a guest. */
  readonly count = signal(0);

  /** Reads the count for the signed-in customer; a guest has no cart. */
  refreshCount() {
    if (!this.browser) return;
    if (!this.auth.isAuthenticated()) { this.count.set(0); return; }
    this.api.count().subscribe({ next: r => this.count.set(r.count), error: () => undefined });
  }

  /** Keeps the header in step with a cart the server just returned. */
  publish(view: CartView) { this.count.set(view.itemCount); }

  /**
   * Adds units of a product. Guests are sent to sign in first (there is no guest cart yet).
   * A product with variants answers "choose-options" when no values were given.
   */
  add(productId: number, quantity: number, valueIds: number[], returnUrl: string): Observable<CartAddOutcome> {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
      return of({ kind: 'login' });
    }
    return this.api.add({ productId, quantity, valueIds }).pipe(
      map((view): CartAddOutcome => { this.publish(view); return { kind: 'added', view }; }),
      catchError(err => of<CartAddOutcome>(this.toOutcome(err, valueIds.length === 0)))
    );
  }

  private toOutcome(err: { status?: number; message?: string; fieldErrors?: Record<string, string[]> }, noValuesGiven: boolean): CartAddOutcome {
    if (err.status === 400 && err.fieldErrors?.['valueIds'] && noValuesGiven) return { kind: 'choose-options' };
    if (err.status === 404) return { kind: 'error', message: translate('storefront.cart.unavailable') };
    return { kind: 'error', message: vendorErrorMessage(err, translate('storefront.cart.addFailed')) };
  }
}
