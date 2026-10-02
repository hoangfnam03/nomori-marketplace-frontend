import { Component, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CartService } from '../../core/cart/cart.service';
import { CurrencyService } from '../../core/money/currency.service';
import { CurrencySelectorComponent } from '../../shared/components/currency-selector/currency-selector.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CurrencySelectorComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly currency = inject(CurrencyService);
  readonly cart = inject(CartService);

  constructor() {
    // The cart count follows the session: a guest has no cart, a customer gets their number.
    // The refresh may set the count signal, which an effect only allows when told so.
    effect(() => {
      this.auth.isAuthenticated();
      this.cart.refreshCount();
    }, { allowSignalWrites: true });

    if (isPlatformBrowser(this.platformId)) {
      this.auth.loadSession().subscribe();
      this.currency.load();
    }
  }

  logout() {
    this.auth.logout().subscribe();
  }
}
