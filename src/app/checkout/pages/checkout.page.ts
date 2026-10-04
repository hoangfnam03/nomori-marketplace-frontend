import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CartService } from '../../core/cart/cart.service';
import { CartLine } from '../../core/cart/cart.models';
import { CustomerAccountDataApiService, CustomerAddress } from '../../core/customer/customer-account-data-api.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { CheckoutPreview, ORDER_ERRORS } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { AddressFormComponent } from '../../shared/components/address-form/address-form.component';

/** Characters a note to a shop may have (the API checks it too). */
const MAX_NOTE = 500;

/**
 * Checkout (F17-A). The chosen cart lines come from the address bar (?items=1,2,3). Every amount is computed by the API;
 * the page sends back the total it showed, and the API refuses the order if its total has moved since.
 */
@Component({
  standalone: true,
  imports: [AddressFormComponent, FormsModule, RouterLink, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page-heading">
      <div class="eyebrow">{{ t('checkout.eyebrow') }}</div>
      <h1>{{ t('checkout.title') }}</h1>
    </div>

    @if (loading) {
      <p class="state">{{ t('checkout.loading') }}</p>
    } @else if (loadError) {
      <p class="banner" role="alert">{{ loadError }}</p>
      <p><a routerLink="/storefront/cart">← {{ t('checkout.backToCart') }}</a></p>
    } @else if (preview) {
      @if (notice) { <p class="banner banner-info" role="status">{{ notice }}</p> }
      @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
      @if (!preview.canPlace) {
        <p class="banner" role="alert">
          {{ blockedReason() }} <a routerLink="/storefront/cart">{{ t('checkout.backToCart') }}</a>
        </p>
      }

      <div class="layout">
        <div class="main">
          <section class="panel" aria-labelledby="address-heading">
            <h2 id="address-heading">{{ t('checkout.address') }}</h2>
            @if (addresses.length === 0 && !addingAddress) {
              <p class="muted">{{ t('checkout.noAddress') }}</p>
            }
            <div class="addresses" role="radiogroup" [attr.aria-label]="t('checkout.address')">
              @for (a of addresses; track a.id) {
                <label class="address" [class.chosen]="addressId === a.id">
                  <input type="radio" name="address" [value]="a.id" [(ngModel)]="addressId" />
                  <span>
                    <strong>{{ a.lastName }} {{ a.firstName }}</strong> · {{ a.phoneNumber }}
                    @if (a.isDefault) { <span class="tag">{{ t('checkout.default') }}</span> }
                    <br /><span class="muted">{{ formatAddress(a) }}</span>
                  </span>
                </label>
              }
            </div>
            @if (addingAddress) {
              <app-address-form [makeDefault]="addresses.length === 0" (saved)="addressSaved()" (cancelled)="addingAddress = false" />
            } @else {
              <button type="button" class="link" (click)="addingAddress = true">+ {{ t('checkout.addAddress') }}</button>
            }
          </section>

          @for (group of preview.groups; track group.vendorId) {
            <section class="panel" [attr.aria-label]="t('storefront.cart.itemsFrom', { name: group.vendorName ?? t('admin.catalog.shop') })">
              <h2><a [routerLink]="['/storefront/vendors', group.vendorId]">{{ group.vendorName ?? t('admin.catalog.shop') }}</a></h2>
              @for (line of group.lines; track line.id) {
                <div class="line" [class.blocked]="isBlocked(line)">
                  @if (media.url(line.mainPictureId); as url) { <img [src]="url" alt="" width="56" height="56" /> } @else { <span class="thumb-empty" aria-hidden="true"></span> }
                  <div>
                    <div class="name">{{ line.name }}</div>
                    @if (line.variantLabel) { <div class="muted">{{ line.variantLabel }}</div> }
                    @if (line.previousUnitPrice !== null) {
                      <div class="warn">{{ t('storefront.cart.issues.priceChangedFrom', { from: money(line.previousUnitPrice), to: money(line.unitPrice) }) }}</div>
                    }
                    @if (isBlocked(line)) { <div class="issue">{{ t('checkout.lineUnavailable') }}</div> }
                  </div>
                  <div class="qty">{{ money(line.unitPrice) }} × {{ line.quantity }}</div>
                  <strong class="amount">{{ money(line.lineTotal) }}</strong>
                </div>
              }
              <label class="note">
                {{ t('checkout.noteToShop') }}
                <textarea rows="2" [maxlength]="maxNote" [(ngModel)]="notes[group.vendorId]" [name]="'note-' + group.vendorId"
                  [placeholder]="t('checkout.notePlaceholder')"></textarea>
              </label>
              <dl class="group-total">
                <div><dt>{{ t('checkout.shipping') }}</dt><dd>{{ group.shippingFee === 0 ? t('checkout.free') : money(group.shippingFee) }}</dd></div>
                <div><dt>{{ t('checkout.shopTotal') }}</dt><dd>{{ money(group.total) }}</dd></div>
              </dl>
            </section>
          }
        </div>

        <aside class="panel summary" [attr.aria-label]="t('storefront.cart.summaryLabel')">
          <h2>{{ t('checkout.payment') }}</h2>
          <label class="method"><input type="radio" name="payment" checked /> {{ t('checkout.cod') }}</label>
          <dl>
            <div><dt>{{ t('checkout.itemsTotal') }}</dt><dd>{{ money(preview.itemsTotal) }}</dd></div>
            <div><dt>{{ t('checkout.shippingTotal') }}</dt><dd>{{ money(preview.shippingTotal) }}</dd></div>
            <div class="grand"><dt>{{ t('checkout.total') }}</dt><dd>{{ money(preview.total) }}</dd></div>
          </dl>
          <p class="muted">{{ t('storefront.cart.currencyNote', { code: preview.currencyCode }) }}</p>
          <button type="button" class="primary" (click)="place()" [disabled]="!canPlace()">
            {{ placing ? t('checkout.placing') : t('checkout.place') }}
          </button>
          @if (!addressId && preview.canPlace) { <p class="muted">{{ t('checkout.chooseAddress') }}</p> }
          <a class="back" routerLink="/storefront/cart">← {{ t('checkout.backToCart') }}</a>
        </aside>
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
    .banner { margin: 0 0 1.5rem; padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; font-size: .9rem; }
    .banner a { color: inherit; font-weight: 700; }
    .banner-info { border-color: var(--green); background: #e5f0e9; color: #205e4a; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 2rem; align-items: start; padding-bottom: 4rem; }
    .main { display: grid; gap: 1.25rem; }
    .panel { border: 1px solid var(--line); padding: 1.1rem; background: rgba(255,255,255,.35); }
    .panel h2 { margin: 0 0 .9rem; font: 700 1.05rem var(--display-font); }
    .panel h2 a { color: var(--ink); }
    .addresses { display: grid; gap: .5rem; margin-bottom: .75rem; }
    .address { display: flex; gap: .7rem; align-items: flex-start; padding: .7rem; border: 1px solid var(--line); cursor: pointer; font-size: .9rem; }
    .address.chosen { border-color: var(--green); background: color-mix(in srgb, var(--green) 6%, transparent); }
    .tag { margin-left: .4rem; font: 700 .62rem var(--mono-font); letter-spacing: .08em; text-transform: uppercase; color: var(--green); }
    .line { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto auto; gap: .9rem; align-items: center; padding: .6rem 0; border-bottom: 1px solid var(--line); }
    .line.blocked { opacity: .65; }
    .line img, .thumb-empty { width: 56px; height: 56px; object-fit: cover; background: #e4e8df; display: block; }
    .name { font-weight: 700; }
    .muted { color: var(--muted); font-size: .8rem; }
    .warn { color: #8a5a00; font-size: .78rem; font-weight: 600; }
    .issue { color: #8d3128; font-size: .78rem; font-weight: 600; }
    .qty { color: var(--muted); font-size: .85rem; white-space: nowrap; }
    .amount { white-space: nowrap; }
    .note { display: grid; gap: .3rem; margin-top: .9rem; color: var(--muted); font-size: .8rem; }
    .note textarea { border: 1px solid var(--line-strong); padding: .5rem; background: var(--paper); color: var(--ink); font: inherit; resize: vertical; }
    dl { margin: .75rem 0 0; display: grid; gap: .4rem; }
    dl div { display: flex; justify-content: space-between; gap: 1rem; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .grand { padding-top: .5rem; border-top: 1px solid var(--line); font-size: 1.1rem; }
    .summary { position: sticky; top: 1rem; display: grid; gap: .75rem; }
    .method { display: flex; gap: .5rem; align-items: center; padding: .7rem; border: 1px solid var(--green); font-size: .9rem; }
    .primary { width: 100%; border: 1px solid var(--ink); padding: .9rem; background: var(--ink); color: var(--paper); font: 700 .95rem inherit; cursor: pointer; }
    .primary:disabled { opacity: .4; cursor: not-allowed; }
    .link { border: 0; padding: 0; background: transparent; color: var(--green); font: 700 .85rem inherit; cursor: pointer; text-decoration: underline; }
    .back { color: var(--muted); font-size: .85rem; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .summary { position: static; } }
    @media (max-width: 600px) { .line { grid-template-columns: 56px minmax(0, 1fr); } .qty, .amount { grid-column: 2; } }
  `]
})
export class CheckoutPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orders = inject(OrderApiService);
  private readonly accountData = inject(CustomerAccountDataApiService);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);
  readonly media = inject(MediaApiService);
  readonly maxNote = MAX_NOTE;

  cartItemIds: number[] = [];
  preview: CheckoutPreview | null = null;
  addresses: CustomerAddress[] = [];
  addressId: number | null = null;
  addingAddress = false;
  notes: Record<number, string> = {};
  loading = true;
  loadError = '';
  actionError = '';
  notice = '';
  placing = false;
  /** One key per attempt: a retried request of the same attempt returns the order already created. */
  private idempotencyKey = newKey();

  ngOnInit() {
    this.cartItemIds = (this.route.snapshot.queryParamMap.get('items') ?? '')
      .split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
    if (this.cartItemIds.length === 0) {
      this.router.navigate(['/storefront/cart']);
      return;
    }
    this.loadAddresses();
    this.loadPreview();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  isBlocked(line: CartLine) { return line.issues.some(i => i !== 'price_changed'); }

  formatAddress(a: CustomerAddress) {
    return [a.address1, a.address2, a.city, a.stateProvince, a.zipPostalCode, a.countryCode].filter(Boolean).join(', ');
  }

  blockedReason() {
    const p = this.preview;
    if (!p) return '';
    if (p.missingCartItemIds.length > 0) return this.transloco.translate('checkout.blocked.missing');
    if (p.ownShopCartItemIds.length > 0) return this.transloco.translate('checkout.blocked.ownShop');
    if (p.groups.length > 10) return this.transloco.translate('checkout.blocked.tooManyShops');
    return this.transloco.translate('checkout.blocked.unavailable');
  }

  canPlace() { return !!this.preview?.canPlace && !!this.addressId && !this.placing && !this.addingAddress; }

  addressSaved() {
    this.addingAddress = false;
    this.loadAddresses(true);
  }

  place() {
    if (!this.canPlace() || !this.preview || !this.addressId) return;
    this.placing = true;
    this.actionError = '';
    this.notice = '';
    const notes = Object.fromEntries(Object.entries(this.notes).filter(([, note]) => note?.trim()).map(([id, note]) => [id, note.trim()]));
    this.orders.place({
      cartItemIds: this.cartItemIds, addressId: this.addressId, paymentMethod: 'cashOnDelivery', notes, expectedTotal: this.preview.total
    }, this.idempotencyKey).subscribe({
      next: order => {
        this.cart.refreshCount();
        this.router.navigate(['/checkout/success', order.id]);
      },
      error: err => {
        this.placing = false;
        // A 4xx is a refusal, so nothing was created and the next attempt gets a new key. After a network error or a 5xx
        // the order may exist: the retry keeps the key, and the API answers with that order instead of a second one.
        if (err?.status >= 400 && err?.status < 500) this.idempotencyKey = newKey();
        switch (err?.message) {
          case ORDER_ERRORS.totalChanged:
            this.notice = this.transloco.translate('checkout.totalChanged');
            this.loadPreview();
            return;
          case ORDER_ERRORS.itemsUnavailable:
            this.actionError = this.transloco.translate('errors.order.items_unavailable');
            this.loadPreview();
            return;
          case ORDER_ERRORS.addressInvalid:
            this.actionError = this.transloco.translate('errors.order.address_invalid');
            this.loadAddresses(true);
            return;
          default:
            this.actionError = vendorErrorMessage(err, this.transloco.translate('checkout.errors.place'));
        }
      }
    });
  }

  private loadPreview() {
    this.orders.preview(this.cartItemIds).subscribe({
      next: preview => { this.preview = preview; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('checkout.errors.load')); }
    });
  }

  /** Picks the default address first; after adding one, picks the newest. */
  private loadAddresses(pickNewest = false) {
    this.accountData.addresses().subscribe({
      next: addresses => {
        this.addresses = addresses;
        if (addresses.length === 0) { this.addressId = null; this.addingAddress = true; return; }
        const keep = addresses.find(a => a.id === this.addressId);
        const newest = addresses.reduce((max, a) => (a.id > max.id ? a : max), addresses[0]);
        this.addressId = (pickNewest ? newest : keep ?? addresses.find(a => a.isDefault) ?? addresses[0]).id;
      },
      error: () => { this.actionError = this.transloco.translate('checkout.errors.addresses'); }
    });
  }
}

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
