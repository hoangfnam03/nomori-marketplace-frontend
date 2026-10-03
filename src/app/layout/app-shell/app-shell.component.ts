import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { permissionCodes } from '../../core/auth/permission-codes';
import { CartService } from '../../core/cart/cart.service';
import { LanguageSwitcherComponent } from '../../core/i18n/language-switcher.component';
import { CurrencyService } from '../../core/money/currency.service';
import { CurrencySelectorComponent } from '../../shared/components/currency-selector/currency-selector.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoDirective, CurrencySelectorComponent, LanguageSwitcherComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly currency = inject(CurrencyService);
  readonly cart = inject(CartService);
  readonly codes = permissionCodes;

  /** Permissions of the signed-in account; menu links follow the same rules as the route guards. */
  private readonly permissions = signal<readonly string[]>([]);
  private loadedPermissionsFor: string | null = null;

  constructor() {
    // The cart count follows the session: a guest has no cart, a customer gets their number.
    // The refresh may set the count signal, which an effect only allows when told so.
    effect(() => {
      this.auth.isAuthenticated();
      this.cart.refreshCount();
    }, { allowSignalWrites: true });

    // Reload permissions when another account signs in or the shop membership changes (approval adds the Vendors role).
    effect(() => {
      const session = this.auth.session();
      const key = session?.isAuthenticated ? `${session.customerId}:${session.vendorId ?? ''}` : null;
      if (key === this.loadedPermissionsFor) return;
      this.loadedPermissionsFor = key;
      if (key === null) { this.permissions.set([]); return; }
      // Accounts without permissions.read get 403, which simply means no admin links.
      this.auth.getPermissions().subscribe({
        next: response => this.permissions.set(response.permissions),
        error: () => this.permissions.set([])
      });
    }, { allowSignalWrites: true });

    if (isPlatformBrowser(this.platformId)) {
      this.auth.loadSession().subscribe();
      this.currency.load();
      this.refreshWhenTabReturns();
    }
  }

  can(permission: string) {
    return this.permissions().includes(permission);
  }

  logout() {
    this.auth.logout().subscribe();
  }

  /** A shop approved while this tab was open shows up as soon as the user comes back to it. */
  private refreshWhenTabReturns() {
    const document = inject(DOCUMENT);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && this.auth.isAuthenticated()) this.auth.refreshSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }
}
