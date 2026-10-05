import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CartService } from '../../core/cart/cart.service';
import { CheckoutApiService } from '../../core/checkout/checkout-api.service';
import { CheckoutPreview, CheckoutProblem, CheckoutShop } from '../../core/checkout/checkout.models';
import { CustomerAccountDataApiService, CustomerAddress } from '../../core/customer/customer-account-data-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { ShippingOption } from '../../core/shipping/shipping.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** Translation key per problem. */
const PROBLEM_KEY: Record<CheckoutProblem, string> = {
  cart_empty: 'storefront.checkout.problems.cartEmpty',
  cart_issues: 'storefront.checkout.problems.cartIssues',
  prices_changed: 'storefront.checkout.problems.pricesChanged',
  address_required: 'storefront.checkout.problems.addressRequired',
  address_invalid: 'storefront.checkout.problems.addressInvalid',
  shipping_unavailable: 'storefront.checkout.problems.shippingUnavailable',
  shipping_not_chosen: 'storefront.checkout.problems.shippingNotChosen',
  shipping_invalid: 'storefront.checkout.problems.shippingInvalid',
  payment_required: 'storefront.checkout.problems.paymentRequired',
  payment_invalid: 'storefront.checkout.problems.paymentInvalid',
  coupon_invalid: 'storefront.checkout.problems.couponInvalid'
};

/** Problems that send the customer back to the cart rather than to a field of this page. */
const CART_PROBLEMS: CheckoutProblem[] = ['cart_empty', 'cart_issues', 'prices_changed'];

/** A key made once per visit; the same key can only ever make one order. */
function newKey(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `co-${random}`.slice(0, 64);
}

/**
 * One page for the whole checkout: address, one shipping option per shop, payment, note, terms. Every change asks the server for a
 * preview, so the totals shown are always the server's; the page adds nothing up.
 */
@Component({
  standalone: true,
  imports: [BreadcrumbComponent, EmptyStateComponent, FormsModule, RouterLink, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: t('nav.cart'), url: '/storefront/cart' }, { label: t('storefront.checkout.title') }]" />
      <div class="eyebrow">{{ t('storefront.checkout.eyebrow') }}</div>
      <h1>{{ t('storefront.checkout.title') }}</h1>
    </div>

    @if (loading) {
      <p class="state">{{ t('common.states.loading') }}</p>
    } @else if (loadError) {
      <p class="state state-error" role="alert">{{ loadError }}</p>
      <button type="button" class="secondary" (click)="start()">{{ t('common.actions.retry') }}</button>
    } @else if (preview && preview.cart.groups.length === 0) {
      <app-empty-state [title]="t('storefront.cart.emptyTitle')" [message]="t('storefront.cart.emptyMessage')" mark="00" />
      <p class="empty-link"><a routerLink="/storefront/products">{{ t('storefront.cart.browse') }} →</a></p>
    } @else if (preview) {
      @if (cartProblem(); as problem) {
        <div class="banner" role="alert">
          <span>{{ t(problemKey(problem)) }}</span>
          <a class="secondary" routerLink="/storefront/cart">{{ t('storefront.checkout.backToCart') }}</a>
        </div>
      }
      @if (placeError) {
        <div class="banner" role="alert">
          <span>{{ placeError }}</span>
          @if (placeErrorGoesToCart) { <a class="secondary" routerLink="/storefront/cart">{{ t('storefront.checkout.backToCart') }}</a> }
        </div>
      }

      <div class="layout">
        <div class="steps">
          <section class="step" aria-labelledby="step-address">
            <h2 id="step-address">1. {{ t('storefront.checkout.address') }}</h2>
            @if (addresses.length === 0) {
              <p class="muted">{{ t('storefront.checkout.noAddress') }} <a routerLink="/customer/settings">{{ t('storefront.checkout.addAddress') }}</a></p>
            } @else {
              <div class="options">
                @for (a of addresses; track a.id) {
                  <label class="option">
                    <input type="radio" name="address" [value]="a.id" [ngModel]="addressId" (ngModelChange)="changeAddress($event)" />
                    <span><strong>{{ a.firstName }} {{ a.lastName }}</strong><br />{{ a.address1 }}, {{ a.city }}@if (a.stateProvince) {, {{ a.stateProvince }}}, {{ a.countryCode }}<br /><span class="muted">{{ a.phoneNumber }}</span></span>
                  </label>
                }
              </div>
              <p class="muted"><a routerLink="/customer/settings">{{ t('storefront.checkout.manageAddresses') }}</a></p>
            }
            @if (fieldError('addressId'); as e) { <p class="issue" role="alert">{{ e }}</p> }
            @if (hasProblem('address_invalid')) { <p class="issue" role="alert">{{ t(problemKey('address_invalid')) }}</p> }
          </section>

          <section class="step" aria-labelledby="step-shipping">
            <h2 id="step-shipping">2. {{ t('storefront.checkout.shipping') }}</h2>
            @if (!preview.addressId) {
              <p class="muted">{{ t('storefront.checkout.chooseAddressFirst') }}</p>
            } @else {
              @for (shop of preview.shops; track shop.vendorId) {
                <fieldset class="shop">
                  <legend>{{ shop.vendorName ?? t('admin.catalog.shop') }}</legend>
                  @if (shop.options.length === 0) {
                    <p class="issue" role="status">{{ t('storefront.checkout.shopCannotShip') }}</p>
                  } @else {
                    @for (option of shop.options; track option.rateId) {
                      <label class="option">
                        <input type="radio" [name]="'ship-' + shop.vendorId" [value]="option.rateId"
                          [ngModel]="choices[shop.vendorId]" (ngModelChange)="chooseShipping(shop, $event)" />
                        <span class="option-body">
                          <span>{{ option.name }}@if (daysText(option); as d) { <span class="muted"> · {{ d }}</span> }</span>
                          <strong>{{ option.isFree ? t('storefront.cart.shipping.free') : money(option.fee) }}</strong>
                        </span>
                      </label>
                    }
                  }
                </fieldset>
              }
            }
            @if (fieldError('shippingChoices'); as e) { <p class="issue" role="alert">{{ e }}</p> }
          </section>

          <section class="step" aria-labelledby="step-payment">
            <h2 id="step-payment">3. {{ t('storefront.checkout.payment') }}</h2>
            <div class="options">
              @for (m of preview.paymentMethods; track m.systemName) {
                <label class="option">
                  <input type="radio" name="payment" [value]="m.systemName" [ngModel]="paymentMethod" (ngModelChange)="changePayment($event)" />
                  <span>{{ m.displayName }}@if (m.isOffline) { <span class="muted"> · {{ t('storefront.checkout.offlineHint') }}</span> }@if (m.redirects) { <span class="muted"> · {{ t('storefront.checkout.redirectHint') }}</span> }</span>
                </label>
              } @empty {
                <p class="issue" role="status">{{ t('storefront.checkout.noPaymentMethods') }}</p>
              }
            </div>
            @if (fieldError('paymentMethod'); as e) { <p class="issue" role="alert">{{ e }}</p> }
          </section>

          <section class="step" aria-labelledby="step-note">
            <h2 id="step-note">4. {{ t('storefront.checkout.noteHeading') }}</h2>
            <label class="sr-only" for="note">{{ t('storefront.checkout.noteHeading') }}</label>
            <textarea id="note" name="note" rows="2" maxlength="500" [(ngModel)]="note" [placeholder]="t('storefront.checkout.notePlaceholder')"></textarea>
            @if (fieldError('note'); as e) { <p class="issue" role="alert">{{ e }}</p> }
          </section>
        </div>

        <aside class="summary" [attr.aria-label]="t('storefront.cart.summaryLabel')">
          <h2>{{ t('storefront.cart.summary') }}</h2>
          @for (group of preview.cart.groups; track group.vendorId) {
            <div class="group">
              <strong>{{ group.vendorName ?? t('admin.catalog.shop') }}</strong>
              @for (line of group.lines; track line.id) {
                <div class="line"><span>{{ line.quantity }} × {{ line.name }}@if (line.variantLabel) { <span class="muted"> ({{ line.variantLabel }})</span> }</span><span>{{ money(line.lineTotal) }}</span></div>
              }
            </div>
          }
          <div class="coupon">
            <label for="coupon">{{ t('storefront.checkout.coupon.label') }}</label>
            <div class="coupon-row">
              <input id="coupon" type="text" name="coupon" [(ngModel)]="couponInput" maxlength="32" autocapitalize="characters"
                [placeholder]="t('storefront.checkout.coupon.placeholder')" (keydown.enter)="applyCoupon()" />
              @if (appliedCode) {
                <button type="button" class="secondary" (click)="removeCoupon()" [disabled]="refreshing">{{ t('storefront.checkout.coupon.remove') }}</button>
              } @else {
                <button type="button" class="secondary" (click)="applyCoupon()" [disabled]="refreshing || !couponInput.trim()">{{ t('storefront.checkout.coupon.apply') }}</button>
              }
            </div>
            @if (preview.couponReason; as reason) { <p class="issue" role="alert">{{ t('storefront.checkout.coupon.reasons.' + reason) }}</p> }
            @if (fieldError('couponCode'); as e) { <p class="issue" role="alert">{{ e }}</p> }
            @if (preview.discount; as discount) {
              <p class="coupon-ok" role="status">{{ t('storefront.checkout.coupon.applied', { code: discount.code }) }}
                · {{ discount.funding === 'platform' ? t('storefront.checkout.coupon.platform') : t('storefront.checkout.coupon.shop') }}</p>
            }
          </div>

          <dl>
            <div><dt>{{ t('storefront.cart.subtotal') }}</dt><dd>{{ money(preview.subtotal) }}</dd></div>
            @if (preview.discount; as discount) {
              <div class="discount"><dt>{{ t('orders.discount') }}</dt><dd>−{{ money(discount.amount) }}</dd></div>
            }
            <div><dt>{{ t('orders.shipping') }}</dt><dd>{{ preview.shippingTotal === null ? '—' : money(preview.shippingTotal) }}</dd></div>
            <div><dt>{{ t('orders.tax') }}</dt><dd>{{ preview.tax === null ? '—' : money(preview.tax.total) }}</dd></div>
            <div class="grand"><dt>{{ t('orders.total') }}</dt><dd>{{ preview.total === null ? '—' : money(preview.total) }}</dd></div>
          </dl>
          <p class="muted note">{{ t('storefront.checkout.currencyNote', { code: preview.cart.currencyCode }) }}</p>
          <p class="muted note">{{ t('storefront.checkout.taxNote') }}</p>

          <label class="terms">
            <input type="checkbox" name="terms" [(ngModel)]="acceptedTerms" />
            <span>{{ t('storefront.checkout.terms') }}</span>
          </label>
          @if (fieldError('acceptedTerms'); as e) { <p class="issue" role="alert">{{ e }}</p> }

          <button type="button" class="primary" (click)="place()" [disabled]="placing || refreshing || !preview.canPlace || !acceptedTerms">
            {{ placing ? t('storefront.checkout.placing') : t('storefront.checkout.place') }}
          </button>
          @if (!preview.canPlace && !cartProblem()) {
            <ul class="problems">
              @for (p of otherProblems(); track p) { <li>{{ t(problemKey(p)) }}</li> }
            </ul>
          }
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
    .state-error { color: #8d3128; }
    .empty-link { text-align: center; padding-bottom: 3rem; }
    .banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin: 0 0 1.5rem; padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; font-size: .9rem; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 3rem; align-items: start; padding-bottom: 4rem; }
    .step { border: 1px solid var(--line); margin-bottom: 1.25rem; padding: 1rem 1.25rem; display: grid; gap: .75rem; }
    .step h2 { margin: 0; font: 700 1.05rem var(--display-font); }
    .options { display: grid; gap: .5rem; }
    .option { display: flex; gap: .75rem; align-items: flex-start; padding: .6rem .75rem; border: 1px solid var(--line); cursor: pointer; font-size: .9rem; line-height: 1.45; }
    .option:has(input:checked) { border-color: var(--green); background: #eef6f1; }
    .option-body { display: flex; justify-content: space-between; gap: 1rem; flex: 1; }
    .shop { border: 0; padding: 0; margin: 0 0 .75rem; display: grid; gap: .5rem; }
    .shop legend { font-weight: 700; padding: 0 0 .4rem; }
    textarea { border: 1px solid var(--line-strong); padding: .5rem; background: transparent; color: var(--ink); font: inherit; resize: vertical; }
    .muted { color: var(--muted); font-size: .8rem; }
    .issue { margin: 0; color: #8d3128; font-size: .8rem; font-weight: 600; }
    .summary { border: 1px solid var(--line-strong); padding: 1.25rem; position: sticky; top: 1rem; display: grid; gap: .75rem; }
    .summary h2 { margin: 0; font: 700 1.1rem var(--display-font); }
    .group { display: grid; gap: .25rem; font-size: .85rem; }
    .line { display: flex; justify-content: space-between; gap: 1rem; }
    dl { margin: 0; display: grid; gap: .4rem; }
    dl div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .grand { border-top: 1px solid var(--line); padding-top: .5rem; font-size: 1.05rem; }
    .note { margin: 0; line-height: 1.5; }
    .terms { display: flex; gap: .5rem; align-items: flex-start; font-size: .85rem; line-height: 1.4; }
    .coupon { display: grid; gap: .4rem; }
    .coupon label { font-size: .8rem; color: var(--muted); }
    .coupon-row { display: flex; gap: .5rem; }
    .coupon-row input { flex: 1; min-width: 0; border: 1px solid var(--line-strong); padding: .45rem .5rem; background: transparent; color: var(--ink); font: inherit; text-transform: uppercase; }
    .coupon-ok { margin: 0; color: #205e4a; font-size: .8rem; font-weight: 600; }
    .discount dd { color: #205e4a; }
    .problems { margin: 0; padding-left: 1.1rem; color: #8d3128; font-size: .8rem; }
    .primary { width: 100%; border: 1px solid var(--ink); padding: .9rem; background: var(--ink); color: var(--paper); font: 700 .95rem inherit; cursor: pointer; }
    .primary:disabled { opacity: .4; cursor: not-allowed; }
    .secondary { border: 1px solid var(--ink); padding: .45rem .9rem; background: transparent; color: var(--ink); font: 700 .8rem inherit; cursor: pointer; text-decoration: none; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .summary { position: static; } }
  `]
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(CheckoutApiService);
  private readonly accountData = inject(CustomerAccountDataApiService);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  preview: CheckoutPreview | null = null;
  addresses: CustomerAddress[] = [];
  addressId: number | null = null;
  /** The customer's pick per shop (vendor id to rate id). */
  choices: Record<number, number> = {};
  paymentMethod: string | null = null;
  /** What the customer is typing, and the code that was sent with the last request. */
  couponInput = '';
  appliedCode: string | null = null;
  note = '';
  acceptedTerms = false;

  loading = true;
  refreshing = false;
  placing = false;
  loadError = '';
  placeError = '';
  placeErrorGoesToCart = false;
  fieldErrors: Record<string, string[]> = {};

  private key = newKey();

  ngOnInit() {
    this.currency.load();
    this.start();
  }

  start() {
    this.loading = true;
    this.loadError = '';
    this.accountData.addresses().subscribe({
      next: addresses => {
        this.addresses = addresses;
        this.addressId = (addresses.find(a => a.isDefault) ?? addresses[0])?.id ?? null;
        this.refresh();
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('storefront.checkout.errors.load')); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  problemKey(problem: CheckoutProblem) { return PROBLEM_KEY[problem]; }

  hasProblem(problem: CheckoutProblem) { return !!this.preview?.problems.includes(problem); }

  cartProblem(): CheckoutProblem | null {
    return CART_PROBLEMS.find(p => this.hasProblem(p)) ?? null;
  }

  otherProblems(): CheckoutProblem[] { return (this.preview?.problems ?? []).filter(p => !CART_PROBLEMS.includes(p) && p !== 'address_invalid' && p !== 'coupon_invalid'); }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  daysText(option: ShippingOption) {
    const { minDays, maxDays } = option;
    if (minDays === null && maxDays === null) return '';
    if (minDays === null || maxDays === null || minDays === maxDays) return this.transloco.translate('storefront.cart.shipping.daysOne', { days: minDays ?? maxDays });
    return this.transloco.translate('storefront.cart.shipping.daysRange', { min: minDays, max: maxDays });
  }

  /** A new choice starts over: the message about the last try no longer applies. */
  private clearMessages() {
    this.placeError = '';
    this.placeErrorGoesToCart = false;
    this.fieldErrors = {};
  }

  changeAddress(id: number) {
    this.clearMessages();
    this.addressId = id;
    this.choices = {};
    this.refresh();
  }

  chooseShipping(shop: CheckoutShop, rateId: number) {
    this.clearMessages();
    this.choices = { ...this.choices, [shop.vendorId]: rateId };
    this.refresh();
  }

  applyCoupon() {
    const code = this.couponInput.trim().toUpperCase();
    if (!code) return;
    this.clearMessages();
    this.couponInput = code;
    this.appliedCode = code;
    this.refresh();
  }

  removeCoupon() {
    this.clearMessages();
    this.appliedCode = null;
    this.couponInput = '';
    this.refresh();
  }

  changePayment(method: string) {
    this.clearMessages();
    this.paymentMethod = method;
    this.refresh();
  }

  /** Asks the server for the preview of the current choices. Whatever the customer has not chosen yet gets its first option, once. */
  refresh() {
    this.refreshing = true;
    this.api.preview({
      addressId: this.addressId,
      shippingChoices: Object.entries(this.choices).map(([vendorId, rateId]) => ({ vendorId: Number(vendorId), rateId })),
      paymentMethod: this.paymentMethod,
      couponCode: this.appliedCode
    }).subscribe({
      next: preview => {
        this.refreshing = false;
        this.loading = false;
        this.preview = preview;
        // The page pre-selects the cheapest option and the first payment method, so the customer sees what will be sent.
        if (this.applyDefaults(preview)) this.refresh();
      },
      error: err => {
        this.refreshing = false;
        this.loading = false;
        this.loadError = vendorErrorMessage(err, this.transloco.translate('storefront.checkout.errors.load'));
      }
    });
  }

  place() {
    if (!this.preview || this.placing) return;
    this.placing = true;
    this.placeError = '';
    this.placeErrorGoesToCart = false;
    this.fieldErrors = {};
    this.api.place({
      addressId: this.addressId,
      shippingChoices: Object.entries(this.choices).map(([vendorId, rateId]) => ({ vendorId: Number(vendorId), rateId })),
      paymentMethod: this.paymentMethod,
      couponCode: this.appliedCode,
      idempotencyKey: this.key,
      acceptedTerms: this.acceptedTerms,
      note: this.note.trim() || null
    }).subscribe({
      next: placed => {
        this.placing = false;
        // The cart is empty now: the header follows.
        this.cart.refreshCount();
        // A method that redirects: the customer pays on the gateway's page and comes back to the order.
        if (placed.paymentRedirectUrl) { window.location.assign(placed.paymentRedirectUrl); return; }
        this.router.navigate(['/customer/orders', placed.orderId], { queryParams: { placed: 1 } });
      },
      error: err => {
        this.placing = false;
        if (err?.status === 400 && err?.fieldErrors) {
          this.fieldErrors = err.fieldErrors;
          // A field of the cart itself (a line too big) is not on this page.
          if (err.fieldErrors['cart']) { this.placeError = err.fieldErrors['cart'].join(' '); this.placeErrorGoesToCart = true; }
          return;
        }
        this.placeError = vendorErrorMessage(err, this.transloco.translate('storefront.checkout.errors.place'));
        // The cart, the stock or the prices changed: the customer has to look at the cart again. The page shows what it is now.
        this.placeErrorGoesToCart = err?.status === 409 && !String(err?.message).includes('payment_failed');
        if (err?.status === 409) this.refresh();
      }
    });
  }

  /** Fills in what the customer has not chosen. True when something was filled, so the preview has to be asked again. */
  private applyDefaults(preview: CheckoutPreview): boolean {
    let changed = false;
    const choices = { ...this.choices };
    for (const shop of preview.shops) {
      const valid = shop.options.some(o => o.rateId === choices[shop.vendorId]);
      if (!valid && shop.options.length > 0) { choices[shop.vendorId] = shop.options[0].rateId; changed = true; }
      if (!valid && shop.options.length === 0 && shop.vendorId in choices) { delete choices[shop.vendorId]; changed = true; }
    }
    this.choices = choices;

    if (!preview.paymentMethods.some(m => m.systemName === this.paymentMethod) && preview.paymentMethods.length > 0) {
      this.paymentMethod = preview.paymentMethods[0].systemName;
      changed = true;
    }
    return changed;
  }
}
