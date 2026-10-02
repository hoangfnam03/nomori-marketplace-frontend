import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A small message after "Add to cart", with a way to the cart. */
@Component({
  selector: 'app-cart-notice',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (message()) {
      <div class="notice" [class.error]="error()" [attr.role]="error() ? 'alert' : 'status'">
        <span>{{ message() }}</span>
        @if (!error()) { <a routerLink="/storefront/cart">View cart</a> }
        <button type="button" (click)="dismissed.emit()" aria-label="Dismiss">×</button>
      </div>
    }
  `,
  styles: [`
    .notice { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 30; max-width: 360px; display: flex; align-items: center; gap: .9rem; padding: .85rem 1rem; border: 1px solid var(--green); background: var(--ink); color: var(--paper); box-shadow: 0 12px 30px rgba(31,37,32,.16); font-size: .9rem; }
    .notice.error { border-color: #b74e3c; background: #7d3026; }
    a { color: var(--paper); font-weight: 700; white-space: nowrap; }
    button { margin-left: auto; border: 0; background: transparent; color: inherit; font-size: 1.2rem; cursor: pointer; }
  `]
})
export class CartNoticeComponent {
  readonly message = input('');
  readonly error = input(false);
  readonly dismissed = output<void>();
}
