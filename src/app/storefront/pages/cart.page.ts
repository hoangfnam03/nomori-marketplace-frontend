import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ShippingEstimateComponent } from '../../shared/components/shipping-estimate/shipping-estimate.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CartApiService } from '../../core/cart/cart-api.service';
import { CartService } from '../../core/cart/cart.service';
import { CartIssue, CartLine, CartView } from '../../core/cart/cart.models';
import { CurrencyService } from '../../core/money/currency.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** Translation key per cart issue. */
const ISSUE_KEY: Record<CartIssue, string> = {
  unavailable: 'storefront.cart.issues.unavailable',
  variant_unavailable: 'storefront.cart.issues.variantUnavailable',
  out_of_stock: 'storefront.cart.issues.outOfStock',
  insufficient_stock: 'storefront.cart.issues.insufficientStock',
  price_changed: 'storefront.cart.issues.priceChanged'
};

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, EmptyStateComponent, FormsModule, RouterLink, ShippingEstimateComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: t('storefront.products.breadcrumb'), url: '/storefront/products' }, { label: t('nav.cart') }]" />
      <div class="eyebrow">{{ t('storefront.cart.eyebrow') }}</div>
      <h1>{{ t('storefront.cart.title') }}</h1>
    </div>

    @if (loading) {
      <p class="state">{{ t('storefront.cart.loading') }}</p>
    } @else if (loadError) {
      <p class="state state-error" role="alert">{{ loadError }}</p>
      <button type="button" class="secondary" (click)="load()">{{ t('common.actions.retry') }}</button>
    } @else if (view && view.groups.length === 0) {
      <app-empty-state [title]="t('storefront.cart.emptyTitle')" [message]="t('storefront.cart.emptyMessage')" mark="00" />
      <p class="empty-link"><a routerLink="/storefront/products">{{ t('storefront.cart.browse') }} →</a></p>
    } @else if (view) {
      @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
      @if (hasPriceChange()) {
        <div class="banner banner-info" role="status">
          <span>{{ t('storefront.cart.pricesChanged') }}</span>
          <button type="button" class="secondary" (click)="acceptPrices()" [disabled]="busy">{{ t('storefront.cart.acceptPrices') }}</button>
        </div>
      }

      <div class="cart-layout">
        <div class="groups">
          <label class="select-all">
            <input type="checkbox" [checked]="allSelected()" [indeterminate]="selected.size > 0 && !allSelected()" (change)="toggleAll()" [disabled]="busy" />
            {{ t('storefront.cart.selectAll', { count: lines().length }) }}
          </label>
          @for (group of view.groups; track group.vendorId) {
            <section class="group" [attr.aria-label]="t('storefront.cart.itemsFrom', { name: group.vendorName ?? t('admin.catalog.shop') })">
              <header class="group-head">
                <h2>
                  <input type="checkbox" [checked]="groupSelected(group)" (change)="toggleGroup(group)" [disabled]="busy"
                    [attr.aria-label]="t('storefront.cart.selectShop', { name: group.vendorName ?? t('admin.catalog.shop') })" />
                  {{ t('storefront.productDetail.soldBy') }} <a [routerLink]="['/storefront/vendors', group.vendorId]">{{ group.vendorName ?? t('admin.catalog.shop') }}</a>
                </h2>
                <span class="muted">{{ t('storefront.cart.subtotalValue', { amount: money(group.subtotal) }) }}</span>
              </header>

              @for (line of group.lines; track line.id) {
                <article class="line" [class.blocked]="isBlocked(line)">
                  <input type="checkbox" class="pick" [checked]="selected.has(line.id)" (change)="toggleLine(line)" [disabled]="busy"
                    [attr.aria-label]="t('storefront.cart.selectLine', { name: line.name })" />
                  <a class="thumb" [routerLink]="['/storefront/products', line.productId]" [attr.aria-label]="t('storefront.card.view', { name: line.name })">
                    @if (pictureUrl(line); as url) { <img [src]="url" alt="" loading="lazy" /> } @else { <span class="thumb-empty" aria-hidden="true"></span> }
                  </a>

                  <div class="line-info">
                    <a class="name" [routerLink]="['/storefront/products', line.productId]">{{ line.name }}</a>
                    @if (line.variantLabel) { <div class="muted">{{ line.variantLabel }}</div> }
                    @if (line.sku) { <div class="muted sku">{{ t('storefront.productDetail.sku', { sku: line.sku }) }}</div> }
                    @for (issue of line.issues; track issue) {
                      <div class="issue" [class.warn]="issue === 'price_changed'" role="status">
                        {{ issueText(issue, line) }}
                      </div>
                    }
                    @if (lineErrors[line.id]) { <div class="issue" role="alert">{{ lineErrors[line.id] }}</div> }
                  </div>

                  <div class="line-qty">
                    <label [attr.for]="'qty-' + line.id" class="sr-only">{{ t('storefront.cart.quantityOf', { name: line.name }) }}</label>
                    <input [id]="'qty-' + line.id" type="number" min="1" max="10000" step="1"
                      [ngModel]="line.quantity" (change)="changeQuantity(line, $event)" [disabled]="busy" />
                    <button type="button" class="link" (click)="remove(line)" [disabled]="busy">{{ t('vendor.shipping.delete') }}</button>
                  </div>

                  <div class="line-price">
                    @if (!isUnpriced(line)) {
                      <strong>{{ money(line.lineTotal) }}</strong>
                      <span class="muted">{{ t('storefront.productDetail.tierEach', { price: money(line.unitPrice) }) }}</span>
                      @if (line.comparePrice) { <del class="muted">{{ money(line.comparePrice) }}</del> }
                      @if (line.appliedRule === 'tier') { <span class="tag">{{ t('storefront.cart.quantityPrice') }}</span> }
                      @if (line.appliedRule === 'special') { <span class="tag">{{ t('storefront.card.sale') }}</span> }
                    } @else {
                      <span class="muted">—</span>
                    }
                  </div>
                </article>
              }
            </section>
          }
        </div>

        <div class="side">
        <aside class="summary" [attr.aria-label]="t('storefront.cart.summaryLabel')">
          <h2>{{ t('storefront.cart.summary') }}</h2>
          <dl>
            <div><dt>{{ t('storefront.cart.selectedItems') }}</dt><dd>{{ selectedUnits() }}</dd></div>
            <div><dt>{{ t('storefront.cart.subtotal') }}</dt><dd>{{ money(selectedSubtotal()) }}</dd></div>
          </dl>
          <p class="muted note">{{ t('storefront.cart.currencyNote', { code: view.currencyCode }) }}</p>
          @if (selectedBlocked()) {
            <p class="issue" role="status">{{ t('storefront.cart.fixSelected') }}</p>
          } @else if (selected.size === 0) {
            <p class="muted note" role="status">{{ t('storefront.cart.chooseItems') }}</p>
          }
          <button type="button" class="primary" (click)="checkout()" [disabled]="!canCheckout()">
            {{ t('storefront.cart.buy', { count: selected.size }) }}
          </button>
          <button type="button" class="link" (click)="clear()" [disabled]="busy">{{ t('storefront.cart.clear') }}</button>
        </aside>
        <app-shipping-estimate [cartKey]="cartKey()" />
        </div>
      </div>
    }
    </ng-container>
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
    .group-head h2 { display: flex; align-items: center; gap: .5rem; margin: 0; font: 700 1rem var(--display-font); }
    .select-all { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; color: var(--muted); font-size: .85rem; }
    input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--green); }
    .pick { margin-top: .35rem; }
    .group-head a { color: var(--green); }
    .line { display: grid; grid-template-columns: auto 72px minmax(0, 1fr) auto auto; gap: 1rem; align-items: start; padding: 1rem; border-bottom: 1px solid var(--line); }
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
    .side { position: sticky; top: 1rem; }
    .summary { border: 1px solid var(--line-strong); padding: 1.25rem; }
    .summary h2 { margin: 0 0 1rem; font: 700 1.1rem var(--display-font); }
    dl { margin: 0 0 1rem; display: grid; gap: .5rem; }
    dl div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .note { margin: .75rem 0; line-height: 1.5; }
    .primary { width: 100%; border: 1px solid var(--ink); padding: .9rem; background: var(--ink); color: var(--paper); font: 700 .95rem inherit; cursor: pointer; }
    .primary:disabled { opacity: .4; cursor: not-allowed; }
    a.primary { display: block; box-sizing: border-box; text-align: center; text-decoration: none; }
    .secondary { border: 1px solid var(--ink); padding: .45rem .9rem; background: transparent; color: var(--ink); font: 700 .8rem inherit; cursor: pointer; }
    .link { border: 0; padding: 0; background: transparent; color: var(--muted); text-decoration: underline; font: inherit; font-size: .8rem; cursor: pointer; }
    .link:hover { color: #8d3128; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 900px) { .cart-layout { grid-template-columns: 1fr; } .side { position: static; } }
    @media (max-width: 600px) { .line { grid-template-columns: auto 56px minmax(0, 1fr); } .thumb { width: 56px; height: 56px; } .line-qty, .line-price { grid-column: 3; justify-items: start; text-align: left; } }
  `]
})
export class CartPage implements OnInit {
  private readonly api = inject(CartApiService);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly media = inject(MediaApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  view: CartView | null = null;
  /** Lines to buy now. Nothing is ticked at first; lines left unticked stay in the cart after the order. */
  selected = new Set<number>();
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
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('storefront.cart.errors.load')); }
    });
  }

  /** The cart is what the customer pays, so it is always shown in the primary currency, never as an approximation. */
  money(value: number) { return this.currency.formatPrimary(value); }

  pictureUrl(line: CartLine) { return this.media.url(line.mainPictureId); }

  isBlocked(line: CartLine) { return line.issues.some(i => i !== 'price_changed'); }

  /** A line that cannot be priced (the product or its option is gone) shows no amounts. */
  isUnpriced(line: CartLine) { return line.issues.includes('unavailable') || line.issues.includes('variant_unavailable'); }

  /** Changes with every quantity and subtotal, so an estimate that is on screen is refreshed. */
  cartKey() { return this.view ? `${this.view.itemCount}:${this.view.subtotal}:${this.view.groups.length}` : ''; }

  hasPriceChange() { return !!this.view?.groups.some(g => g.lines.some(l => l.issues.includes('price_changed'))); }

  issueText(issue: CartIssue, line: CartLine): string {
    if (issue === 'insufficient_stock') return this.transloco.translate('storefront.cart.issues.onlyInStock', { count: line.availableQuantity ?? 0 });
    if (issue === 'price_changed' && line.previousUnitPrice !== null) return this.transloco.translate('storefront.cart.issues.priceChangedFrom', { from: this.money(line.previousUnitPrice), to: this.money(line.unitPrice) });
    return this.transloco.translate(ISSUE_KEY[issue]);
  }

  changeQuantity(line: CartLine, event: Event) {
    const input = event.target as HTMLInputElement;
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      this.lineErrors = { ...this.lineErrors, [line.id]: this.transloco.translate('storefront.productDetail.quantityRange') };
      input.value = String(line.quantity);
      return;
    }
    if (quantity === line.quantity) return;
    this.run(this.api.setQuantity(line.id, quantity), line.id, input, line.quantity);
  }

  remove(line: CartLine) { this.run(this.api.remove(line.id), line.id); }

  acceptPrices() { this.run(this.api.acceptPrices()); }

  clear() { this.run(this.api.clear()); }

  // ---- Choosing what to buy ----

  lines(): CartLine[] { return this.view?.groups.flatMap(g => g.lines) ?? []; }

  allSelected() { return this.lines().length > 0 && this.lines().every(l => this.selected.has(l.id)); }

  groupSelected(group: CartView['groups'][number]) { return group.lines.every(l => this.selected.has(l.id)); }

  toggleAll() { this.setSelected(this.lines(), !this.allSelected()); }

  toggleGroup(group: CartView['groups'][number]) { this.setSelected(group.lines, !this.groupSelected(group)); }

  toggleLine(line: CartLine) { this.setSelected([line], !this.selected.has(line.id)); }

  selectedLines() { return this.lines().filter(l => this.selected.has(l.id)); }

  selectedUnits() { return this.selectedLines().reduce((sum, l) => sum + l.quantity, 0); }

  selectedSubtotal() { return this.selectedLines().reduce((sum, l) => sum + l.lineTotal, 0); }

  /** A line that cannot be bought only matters when it is ticked. */
  selectedBlocked() { return this.selectedLines().some(l => this.isBlocked(l)); }

  canCheckout() { return !this.busy && this.selected.size > 0 && !this.selectedBlocked(); }

  /** The chosen lines travel in the address bar, so a refresh of the checkout page keeps them. */
  checkout() {
    if (!this.canCheckout()) return;
    this.router.navigate(['/storefront/checkout'], { queryParams: { items: this.selectedLines().map(l => l.id).join(',') } });
  }

  private setSelected(lines: CartLine[], on: boolean) {
    const next = new Set(this.selected);
    for (const line of lines) {
      if (on) next.add(line.id); else next.delete(line.id);
    }
    this.selected = next;
  }

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
        else this.actionError = vendorErrorMessage(err, this.transloco.translate('auth.errors.unexpected'));
      }
    });
  }

  private apply(view: CartView) {
    this.view = view;
    this.lineErrors = {};
    this.cart.publish(view);
    const ids = view.groups.flatMap(g => g.lines.map(l => l.id));
    this.selected = new Set(ids.filter(id => this.selected.has(id)));
  }
}
