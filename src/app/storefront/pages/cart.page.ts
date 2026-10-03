import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CartApiService } from '../../core/cart/cart-api.service';
import { CartService } from '../../core/cart/cart.service';
import { CartIssue, CartLine, CartView } from '../../core/cart/cart.models';
import { CurrencyService } from '../../core/money/currency.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const ISSUE_TEXT: Record<CartIssue, string> = {
  unavailable: 'No longer available',
  variant_unavailable: 'This option is no longer offered',
  out_of_stock: 'Out of stock',
  insufficient_stock: 'Not enough in stock',
  price_changed: 'Price changed'
};

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, EmptyStateComponent, FormsModule, RouterLink],
  template: `
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: 'Products', url: '/storefront/products' }, { label: 'Cart' }]" />
      <div class="eyebrow">Storefront / Cart</div>
      <h1>Your cart.</h1>
    </div>

    @if (loading) {
      <p class="state">Loading your cart…</p>
    } @else if (loadError) {
      <p class="state state-error" role="alert">{{ loadError }}</p>
      <button type="button" class="secondary" (click)="load()">Try again</button>
    } @else if (view && view.groups.length === 0) {
      <app-empty-state title="Your cart is empty" message="Find something you like and add it to your cart." mark="00" />
      <p class="empty-link"><a routerLink="/storefront/products">Browse products →</a></p>
    } @else if (view) {
      @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
      @if (hasPriceChange()) {
        <div class="banner banner-info" role="status">
          <span>Some prices changed since you added them. Check the lines marked “Price changed”.</span>
          <button type="button" class="secondary" (click)="acceptPrices()" [disabled]="busy">Accept new prices</button>
        </div>
      }

      <div class="cart-layout">
        <div class="groups">
          @for (group of view.groups; track group.vendorId) {
            <section class="group" [attr.aria-label]="'Items from ' + (group.vendorName ?? 'shop')">
              <header class="group-head">
                <h2>Sold by <a [routerLink]="['/storefront/vendors', group.vendorId]">{{ group.vendorName ?? 'Shop' }}</a></h2>
                <span class="muted">Subtotal {{ money(group.subtotal) }}</span>
              </header>

              @for (line of group.lines; track line.id) {
                <article class="line" [class.blocked]="isBlocked(line)">
                  <a class="thumb" [routerLink]="['/storefront/products', line.productId]" [attr.aria-label]="'View ' + line.name">
                    @if (pictureUrl(line); as url) { <img [src]="url" alt="" loading="lazy" /> } @else { <span class="thumb-empty" aria-hidden="true"></span> }
                  </a>

                  <div class="line-info">
                    <a class="name" [routerLink]="['/storefront/products', line.productId]">{{ line.name }}</a>
                    @if (line.variantLabel) { <div class="muted">{{ line.variantLabel }}</div> }
                    @if (line.sku) { <div class="muted sku">SKU {{ line.sku }}</div> }
                    @for (issue of line.issues; track issue) {
                      <div class="issue" [class.warn]="issue === 'price_changed'" role="status">
                        {{ issueText(issue, line) }}
                      </div>
                    }
                    @if (lineErrors[line.id]) { <div class="issue" role="alert">{{ lineErrors[line.id] }}</div> }
                  </div>

                  <div class="line-qty">
                    <label [attr.for]="'qty-' + line.id" class="sr-only">Quantity of {{ line.name }}</label>
                    <input [id]="'qty-' + line.id" type="number" min="1" max="10000" step="1"
                      [ngModel]="line.quantity" (change)="changeQuantity(line, $event)" [disabled]="busy" />
                    <button type="button" class="link" (click)="remove(line)" [disabled]="busy">Remove</button>
                  </div>

                  <div class="line-price">
                    @if (!isUnpriced(line)) {
                      <strong>{{ money(line.lineTotal) }}</strong>
                      <span class="muted">{{ money(line.unitPrice) }} each</span>
                      @if (line.comparePrice) { <del class="muted">{{ money(line.comparePrice) }}</del> }
                      @if (line.appliedRule === 'tier') { <span class="tag">Quantity price</span> }
                      @if (line.appliedRule === 'special') { <span class="tag">Sale</span> }
                    } @else {
                      <span class="muted">—</span>
                    }
                  </div>
                </article>
              }
            </section>
          }
        </div>

        <aside class="summary" aria-label="Order summary">
          <h2>Summary</h2>
          <dl>
            <div><dt>Items</dt><dd>{{ view.itemCount }}</dd></div>
            <div><dt>Subtotal</dt><dd>{{ money(view.subtotal) }}</dd></div>
          </dl>
          <p class="muted note">Shipping and taxes are added at checkout. Prices are in {{ view.currencyCode }}; you always pay in {{ view.currencyCode }}.</p>
          @if (!view.canCheckout) {
            <p class="issue" role="status">Fix or remove the lines marked above to continue.</p>
          }
          <button type="button" class="primary" disabled>Checkout</button>
          <p class="muted note">Checkout is the next step of the marketplace and is not available yet.</p>
          <button type="button" class="link" (click)="clear()" [disabled]="busy">Clear cart</button>
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading { padding: 1rem 0 2rem; }
    .eyebrow { margin-top: 2rem; color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 1rem 0 0; font: 700 clamp(2.5rem, 6vw, 4.5rem)/.95 var(--display-font); }
    .state { color: var(--muted); padding: 2rem 0; }
    .state-error { color: #8d3128; }
    .empty-link { text-align: center; padding-bottom: 3rem; }
    .banner { margin: 0 0 1.5rem; padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; font-size: .9rem; }
    .banner-info { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; border-color: var(--green); background: #e5f0e9; color: #205e4a; }
    .cart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 3rem; align-items: start; padding-bottom: 4rem; }
    .group { border: 1px solid var(--line); margin-bottom: 1.5rem; }
    .group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; padding: .8rem 1rem; border-bottom: 1px solid var(--line); background: rgba(255,255,255,.4); }
    .group-head h2 { margin: 0; font: 700 1rem var(--display-font); }
    .group-head a { color: var(--green); }
    .line { display: grid; grid-template-columns: 72px minmax(0, 1fr) auto auto; gap: 1rem; align-items: start; padding: 1rem; border-bottom: 1px solid var(--line); }
    .line:last-child { border-bottom: 0; }
    .line.blocked { background: #faf3f1; }
    .thumb { display: block; width: 72px; height: 72px; background: #e4e8df; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-empty { display: block; width: 100%; height: 100%; }
    .name { color: var(--ink); font-weight: 700; text-decoration: none; }
    .name:hover { color: var(--green); }
    .muted { color: var(--muted); font-size: .8rem; }
    .sku { font-family: var(--mono-font); }
    .issue { margin-top: .35rem; color: #8d3128; font-size: .8rem; font-weight: 600; }
    .issue.warn { color: #8a5a00; }
    .line-qty { display: grid; gap: .4rem; justify-items: start; }
    .line-qty input { width: 5rem; border: 1px solid var(--line-strong); padding: .4rem .5rem; background: transparent; color: var(--ink); font: inherit; }
    .line-price { display: grid; gap: .15rem; justify-items: end; text-align: right; min-width: 7rem; }
    .tag { font: 700 .62rem var(--mono-font); letter-spacing: .08em; text-transform: uppercase; color: var(--green); }
    .summary { border: 1px solid var(--line-strong); padding: 1.25rem; position: sticky; top: 1rem; }
    .summary h2 { margin: 0 0 1rem; font: 700 1.1rem var(--display-font); }
    dl { margin: 0 0 1rem; display: grid; gap: .5rem; }
    dl div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .note { margin: .75rem 0; line-height: 1.5; }
    .primary { width: 100%; border: 1px solid var(--ink); padding: .9rem; background: var(--ink); color: var(--paper); font: 700 .95rem inherit; cursor: pointer; }
    .primary:disabled { opacity: .4; cursor: not-allowed; }
    .secondary { border: 1px solid var(--ink); padding: .45rem .9rem; background: transparent; color: var(--ink); font: 700 .8rem inherit; cursor: pointer; }
    .link { border: 0; padding: 0; background: transparent; color: var(--muted); text-decoration: underline; font: inherit; font-size: .8rem; cursor: pointer; }
    .link:hover { color: #8d3128; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 900px) { .cart-layout { grid-template-columns: 1fr; } .summary { position: static; } }
    @media (max-width: 600px) { .line { grid-template-columns: 56px minmax(0, 1fr); } .thumb { width: 56px; height: 56px; } .line-qty, .line-price { grid-column: 2; justify-items: start; text-align: left; } }
  `]
})
export class CartPage implements OnInit {
  private readonly api = inject(CartApiService);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly media = inject(MediaApiService);

  view: CartView | null = null;
  loading = true;
  loadError = '';
  actionError = '';
  busy = false;
  lineErrors: Record<number, string> = {};

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.get().subscribe({
      next: view => { this.apply(view); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load your cart.'); }
    });
  }

  /** The cart is what the customer pays, so it is always shown in the primary currency, never as an approximation. */
  money(value: number) { return this.currency.formatPrimary(value); }

  pictureUrl(line: CartLine) { return this.media.url(line.mainPictureId); }

  isBlocked(line: CartLine) { return line.issues.some(i => i !== 'price_changed'); }

  /** A line that cannot be priced (the product or its option is gone) shows no amounts. */
  isUnpriced(line: CartLine) { return line.issues.includes('unavailable') || line.issues.includes('variant_unavailable'); }

  hasPriceChange() { return !!this.view?.groups.some(g => g.lines.some(l => l.issues.includes('price_changed'))); }

  issueText(issue: CartIssue, line: CartLine): string {
    if (issue === 'insufficient_stock') return `Only ${line.availableQuantity ?? 0} in stock. Lower the quantity.`;
    if (issue === 'price_changed' && line.previousUnitPrice !== null) return `Price changed from ${this.money(line.previousUnitPrice)} to ${this.money(line.unitPrice)} each.`;
    return ISSUE_TEXT[issue];
  }

  changeQuantity(line: CartLine, event: Event) {
    const input = event.target as HTMLInputElement;
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      this.lineErrors = { ...this.lineErrors, [line.id]: 'Enter a quantity between 1 and 10,000.' };
      input.value = String(line.quantity);
      return;
    }
    if (quantity === line.quantity) return;
    this.run(this.api.setQuantity(line.id, quantity), line.id, input, line.quantity);
  }

  remove(line: CartLine) { this.run(this.api.remove(line.id), line.id); }

  acceptPrices() { this.run(this.api.acceptPrices()); }

  clear() { this.run(this.api.clear()); }

  private run(request: ReturnType<CartApiService['get']>, lineId?: number, input?: HTMLInputElement, previous?: number) {
    this.busy = true;
    this.actionError = '';
    if (lineId !== undefined) this.lineErrors = { ...this.lineErrors, [lineId]: '' };
    request.subscribe({
      next: view => { this.busy = false; this.apply(view); },
      error: err => {
        this.busy = false;
        // Put the field back so it never shows a quantity the server refused.
        if (input && previous !== undefined) input.value = String(previous);
        const field = err?.status === 400 && err?.fieldErrors ? Object.values(err.fieldErrors as Record<string, string[]>).flat().join(' ') : '';
        if (lineId !== undefined && field) this.lineErrors = { ...this.lineErrors, [lineId]: field };
        else this.actionError = vendorErrorMessage(err, 'Something went wrong. Try again.');
      }
    });
  }

  private apply(view: CartView) {
    this.view = view;
    this.lineErrors = {};
    this.cart.publish(view);
  }
}
