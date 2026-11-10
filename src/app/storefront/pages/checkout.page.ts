import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CartService } from '../../core/cart/cart.service';
import { CheckoutApiService } from '../../core/checkout/checkout-api.service';
import { CheckoutCoupon, CheckoutPreview, CheckoutProblem, CheckoutShop } from '../../core/checkout/checkout.models';
import { DiscountKind } from '../../core/discounts/discount.models';
import { CustomerAccountDataApiService, CustomerAddress } from '../../core/customer/customer-account-data-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { ShippingOption } from '../../core/shipping/shipping.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { WalletApiService } from '../../core/wallets/wallet-api.service';
import { WALLET_METHOD } from '../../core/wallets/wallet.models';
import { paymentMethodName } from '../../core/payments/payment-method-name';

/** Translation key per problem. */
const PROBLEM_KEY: Record<CheckoutProblem, string> = {
  cart_empty: 'storefront.checkout.problems.cartEmpty',
  cart_issues: 'storefront.checkout.problems.cartIssues',
  prices_changed: 'storefront.checkout.problems.pricesChanged',
  address_required: 'storefront.checkout.problems.addressRequired',
  address_invalid: 'storefront.checkout.problems.addressInvalid',
  address_area_missing: 'storefront.checkout.problems.addressAreaMissing',
  shipping_unavailable: 'storefront.checkout.problems.shippingUnavailable',
  shipping_not_chosen: 'storefront.checkout.problems.shippingNotChosen',
  shipping_invalid: 'storefront.checkout.problems.shippingInvalid',
  payment_required: 'storefront.checkout.problems.paymentRequired',
  payment_invalid: 'storefront.checkout.problems.paymentInvalid',
  coupon_invalid: 'storefront.checkout.problems.couponInvalid',
  shipping_coupon_invalid: 'storefront.checkout.problems.couponInvalid',
  selection_changed: 'storefront.checkout.problems.selectionChanged'
};

/** A shipping code; an offer without a kind is an item code. */
const isShipping = (offer: CheckoutCoupon) => offer.kind === 'shipping';

/** Problems that send the customer back to the cart rather than to a field of this page. */
const CART_PROBLEMS: CheckoutProblem[] = ['cart_empty', 'cart_issues', 'prices_changed', 'selection_changed'];

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
  imports: [BreadcrumbComponent, DatePipe, EmptyStateComponent, FormsModule, RouterLink, TranslocoDirective],
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
            @if (hasProblem('address_area_missing')) {
              <p class="issue" role="alert">{{ t(problemKey('address_area_missing')) }} <a routerLink="/customer/account-data">{{ t('storefront.checkout.editAddress') }}</a></p>
            }
          </section>

          <section class="step" aria-labelledby="step-shipping">
            <h2 id="step-shipping">2. {{ t('storefront.checkout.shipping') }}</h2>
            @if (!preview.addressId) {
              <p class="muted">{{ t('storefront.checkout.chooseAddressFirst') }}</p>
            } @else {
              @for (shop of preview.shops; track shop.vendorId) {
                <fieldset class="shop">
                  <!-- Kept for screen readers only: on screen the options speak for themselves. -->
                  <legend class="sr-only">{{ shop.vendorName ?? t('admin.catalog.shop') }}</legend>
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
                  <input type="radio" name="payment" [value]="m.systemName" [ngModel]="paymentMethod" (ngModelChange)="changePayment($event)"
                    [disabled]="walletShort(m.systemName)" />
                  @if (m.systemName === walletMethod) {
                    <span>{{ t('storefront.checkout.wallet.name') }}
                      @if (walletBalance !== null) { <span class="muted"> · {{ t('storefront.checkout.wallet.balance', { balance: money(walletBalance) }) }}</span> }
                      @if (walletShort(m.systemName)) {
                        <span class="muted"> · {{ t('storefront.checkout.wallet.short') }} <a routerLink="/customer/wallet">{{ t('storefront.checkout.wallet.topUp') }}</a></span>
                      }
                    </span>
                  } @else {
                  <span>{{ methodName(m.systemName, m.displayName) }}</span>
                  }
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
                <div class="line"><span class="line-name">{{ line.quantity }} × {{ line.name }}@if (line.variantLabel) { <span class="muted"> ({{ line.variantLabel }})</span> }</span><span class="line-total">{{ money(line.lineTotal) }}</span></div>
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
              <p class="coupon-ok" role="status">{{ t('storefront.checkout.coupon.applied', { code: discount.code }) }}</p>
            }
            @if (appliedShippingCode) {
              <div class="applied-shipping">
                @if (preview.shippingDiscount; as shipping) {
                  <p class="coupon-ok" role="status">{{ t('storefront.checkout.coupon.appliedShipping', { code: shipping.code }) }}</p>
                } @else {
                  <p class="muted">{{ t('storefront.checkout.coupon.appliedShipping', { code: appliedShippingCode }) }}</p>
                }
                <button type="button" class="link-button" (click)="removeShippingCoupon()" [disabled]="refreshing">{{ t('storefront.checkout.coupon.remove') }}</button>
              </div>
            }
            @if (preview.shippingCouponReason; as reason) { <p class="issue" role="alert">{{ t('storefront.checkout.coupon.reasons.' + reason) }}</p> }
            @if (fieldError('shippingCouponCode'); as e) { <p class="issue" role="alert">{{ e }}</p> }
            <!-- The codes open in a dialog, so the summary stays short however many codes there are. -->
            <button type="button" class="offers-open" (click)="openCoupons()" [disabled]="refreshing">
              <span>{{ t('storefront.checkout.coupon.choose') }}</span>
              <span class="muted">{{ usableCoupons() ? t('storefront.checkout.coupon.usableCount', { count: usableCoupons() }) : t('storefront.checkout.coupon.noneUsable') }} ›</span>
            </button>
          </div>

          <!--
            Every code for these lines, in two groups: shipping codes and item codes. A usable code is ticked with its radio, then "Use code"
            applies what is ticked. One code of each kind: once one is ticked the others of its group are disabled (untick it to choose another).
          -->
          <dialog #couponDialog class="coupon-dialog" [attr.aria-label]="t('storefront.checkout.coupon.available')" (click)="closeOnBackdrop($event)">
            <div class="dialog-head">
              <h3>{{ t('storefront.checkout.coupon.available') }}</h3>
              <button type="button" class="dialog-close" (click)="closeCoupons()" [attr.aria-label]="t('storefront.checkout.coupon.close')">×</button>
            </div>
            <div class="dialog-body">
              @if (preview.coupons.length) {
                <p class="muted offers-hint">{{ t('storefront.checkout.coupon.oneCode') }}</p>
                @for (group of offerGroups(); track group.kind) {
                <h4 class="offers-group">{{ t('storefront.checkout.coupon.groups.' + group.kind) }}</h4>
                @if (!group.offers.length) { <p class="muted offers-none">{{ t('storefront.checkout.coupon.noneOfKind') }}</p> }
                <ul class="offers">
                  @for (offer of group.offers; track offer.code) {
                    <li>
                      <label class="offer" [class.picked]="isTicked(offer)" [class.disabled]="!canTick(offer)">
                        <input type="radio" [name]="'couponOffer-' + group.kind" [value]="offer.code" [checked]="isTicked(offer)" [disabled]="!canTick(offer)"
                          (click)="tick(offer)" />
                        <span class="offer-text">
                          <span class="offer-head">
                            <strong class="offer-code">{{ offer.code }}</strong>
                            @if (offer.amount !== null) { <span class="offer-amount">−{{ money(offer.amount) }}</span> }
                          </span>
                          <span class="offer-what">{{ offerSummary(offer) }} · {{ offerScope(offer) }}</span>
                          <span class="offer-terms muted">
                            @if (offer.minSubtotal !== null) { {{ t('storefront.checkout.coupon.minSubtotal', { amount: money(offer.minSubtotal) }) }} }
                            @if (offer.minSubtotal !== null && offer.endsOnUtc) { · }
                            @if (offer.endsOnUtc) { {{ t('storefront.checkout.coupon.endsOn', { date: (offer.endsOnUtc | date: 'dd/MM/yyyy HH:mm') }) }} }
                          </span>
                          @if (isApplied(offer) && offer.amount !== null) {
                            <span class="offer-state">{{ t('storefront.checkout.coupon.inUse') }}</span>
                          } @else if (offer.reason) {
                            <span class="offer-reason">
                              @switch (offer.reason) {
                                @case ('min_subtotal') { {{ t('storefront.checkout.coupon.shortfall', { amount: money(offer.shortfall ?? 0) }) }} }
                                @case ('not_started') { {{ t('storefront.checkout.coupon.startsOn', { date: (offer.startsOnUtc | date: 'dd/MM/yyyy HH:mm') }) }} }
                                @default { {{ t('storefront.checkout.coupon.reasons.' + offer.reason) }} }
                              }
                            </span>
                          }
                        </span>
                      </label>
                    </li>
                  }
                </ul>
                }
              } @else {
                <p class="muted offers-none">{{ t('storefront.checkout.coupon.none') }}</p>
              }
            </div>
            <div class="dialog-foot">
              <button type="button" class="secondary" (click)="closeCoupons()">{{ t('storefront.checkout.coupon.back') }}</button>
              <button type="button" class="primary use-code" (click)="useCode()"
                [disabled]="refreshing || (pendingCode === appliedCode && pendingShippingCode === appliedShippingCode)">{{ t('storefront.checkout.coupon.use') }}</button>
            </div>
          </dialog>

          <dl>
            <div><dt>{{ t('storefront.cart.subtotal') }}</dt><dd>{{ money(preview.subtotal) }}</dd></div>
            @if (preview.discount; as discount) {
              <div class="discount"><dt>{{ t('orders.discount') }}</dt><dd>−{{ money(discount.amount) }}</dd></div>
            }
            <div><dt>{{ t('orders.shipping') }}</dt><dd>{{ preview.shippingTotal === null ? '—' : money(preview.shippingTotal) }}</dd></div>
            @if (preview.shippingDiscount; as shipping) {
              <div class="discount"><dt>{{ t('orders.shippingDiscount') }}</dt><dd>−{{ money(shipping.amount) }}</dd></div>
            }
            <div><dt>{{ t('orders.tax') }}</dt><dd>{{ preview.tax === null ? '—' : money(preview.tax.total) }}</dd></div>
            <div class="grand"><dt>{{ t('orders.total') }}</dt><dd>{{ preview.total === null ? '—' : money(preview.total) }}</dd></div>
          </dl>
          <p class="muted note">{{ t('storefront.checkout.taxNote') }}</p>

          <label class="terms">
            <input type="checkbox" name="terms" [(ngModel)]="acceptedTerms" />
            <span>{{ t('storefront.checkout.terms') }}</span>
          </label>
          @if (fieldError('acceptedTerms'); as e) { <p class="issue" role="alert">{{ e }}</p> }

          <button type="button" class="primary" (click)="openConfirm()" [disabled]="placing || refreshing || !preview.canPlace || !acceptedTerms || walletShort(paymentMethod)">
            {{ placing ? t('storefront.checkout.placing') : t('storefront.checkout.place') }}
          </button>

          <!-- The customer checks what will be ordered once more before the order is sent. -->
          <dialog #confirmDialog class="coupon-dialog confirm-dialog" [attr.aria-label]="t('storefront.checkout.confirm.title')" (click)="closeConfirmOnBackdrop($event)">
            <div class="dialog-head">
              <h3>{{ t('storefront.checkout.confirm.title') }}</h3>
              <button type="button" class="dialog-close" (click)="closeConfirm()" [attr.aria-label]="t('storefront.checkout.coupon.close')">×</button>
            </div>
            <div class="dialog-body confirm-body">
              <p class="confirm-lead">{{ t('storefront.checkout.confirm.message') }}</p>
              <dl>
                @if (selectedAddress(); as a) {
                  <div class="confirm-row confirm-address"><dt>{{ t('storefront.checkout.address') }}</dt><dd>{{ a.firstName }} {{ a.lastName }} · {{ a.address1 }}, {{ a.city }}</dd></div>
                }
                <div class="confirm-items">
                  <dt>{{ t('storefront.checkout.confirm.items') }}</dt>
                  <dd>
                    <ul>
                      @for (group of preview.cart.groups; track group.vendorId) {
                        @for (line of group.lines; track line.id) {
                          <li>
                            <span class="confirm-name">{{ line.name }}@if (line.variantLabel) { <span class="muted"> · {{ line.variantLabel }}</span> }</span>
                            <span class="confirm-qty">× {{ line.quantity }}</span>
                          </li>
                        }
                      }
                    </ul>
                  </dd>
                </div>
                @if (selectedPaymentName(); as pay) {
                  <div class="confirm-row"><dt>{{ t('storefront.checkout.payment') }}</dt><dd>{{ pay }}</dd></div>
                }
                <div class="confirm-row confirm-money"><dt>{{ t('storefront.cart.subtotal') }}</dt><dd>{{ money(preview.subtotal) }}</dd></div>
                <div class="confirm-row"><dt>{{ t('orders.shipping') }}</dt><dd>{{ preview.shippingTotal === null ? '—' : money(preview.shippingTotal) }}</dd></div>
                @if (preview.shippingDiscount; as shipping) {
                  <div class="confirm-row discount"><dt>{{ t('orders.shippingDiscount') }} ({{ shipping.code }})</dt><dd>−{{ money(shipping.amount) }}</dd></div>
                }
                @if (preview.discount; as discount) {
                  <div class="confirm-row discount"><dt>{{ t('orders.discount') }} ({{ discount.code }})</dt><dd>−{{ money(discount.amount) }}</dd></div>
                }
                @if (preview.tax; as tax) {
                  <div class="confirm-row"><dt>{{ t('orders.tax') }}</dt><dd>{{ money(tax.total) }}</dd></div>
                }
                <div class="grand"><dt>{{ t('orders.total') }}</dt><dd>{{ preview.total === null ? '—' : money(preview.total) }}</dd></div>
              </dl>
            </div>
            <div class="dialog-foot">
              <button type="button" class="secondary" (click)="closeConfirm()">{{ t('storefront.checkout.coupon.back') }}</button>
              <button type="button" class="primary confirm-submit" (click)="confirmPlace()" [disabled]="placing || refreshing || !preview.canPlace">{{ t('storefront.checkout.confirm.submit') }}</button>
            </div>
          </dialog>
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
    .line { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
    /* A long name wraps on its own side; the amount stays on one line. */
    .line-name { min-width: 0; overflow-wrap: anywhere; }
    .line-total { flex-shrink: 0; white-space: nowrap; }
    dl { margin: 0; display: grid; gap: .4rem; }
    dl div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; white-space: nowrap; }
    .grand { border-top: 1px solid var(--line); padding-top: .5rem; font-size: 1.05rem; }
    .note { margin: 0; line-height: 1.5; }
    .terms { display: flex; gap: .5rem; align-items: flex-start; font-size: .85rem; line-height: 1.4; }
    .coupon { display: grid; gap: .4rem; }
    .coupon label { font-size: .8rem; color: var(--muted); }
    .coupon-row { display: flex; gap: .5rem; }
    .coupon-row input { flex: 1; min-width: 0; border: 1px solid var(--line-strong); padding: .45rem .5rem; background: transparent; color: var(--ink); font: inherit; text-transform: uppercase; }
    .coupon-ok { margin: 0; color: #205e4a; font-size: .8rem; font-weight: 600; }
    .offers-open { display: flex; justify-content: space-between; align-items: center; gap: .5rem; width: 100%; margin-top: .2rem; padding: .5rem .6rem; border: 1px dashed var(--line-strong); background: transparent; color: var(--ink); font: inherit; font-size: .82rem; cursor: pointer; text-align: left; }
    .offers-open:hover:not(:disabled) { border-color: var(--green); }
    .coupon-dialog { width: min(480px, calc(100vw - 2rem)); max-height: min(640px, calc(100vh - 4rem)); padding: 0; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink); }
    .coupon-dialog[open] { display: flex; flex-direction: column; }
    .coupon-dialog::backdrop { background: rgba(31,37,32,.45); }
    .dialog-head { display: flex; justify-content: space-between; align-items: center; padding: .85rem 1rem; border-bottom: 1px solid var(--line); }
    .dialog-head h3 { margin: 0; font-size: 1rem; }
    .dialog-close { border: none; background: transparent; color: var(--ink); font-size: 1.4rem; line-height: 1; cursor: pointer; }
    .dialog-body { padding: .85rem 1rem 1rem; overflow-y: auto; }
    .offers-none { margin: 0; font-size: .85rem; }
    .offers { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .offer { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .65rem; align-items: start; padding: .6rem .7rem; border: 1px dashed var(--line-strong); font-size: .8rem; cursor: pointer; }
    .offer input { margin: .15rem 0 0; accent-color: var(--green); }
    .offer-text { display: grid; gap: .15rem; }
    .offer:hover:not(.disabled) { border-color: var(--green); background: rgba(39,116,93,.05); }
    .offer.picked { border-style: solid; border-color: var(--green); background: rgba(39,116,93,.08); }
    .offer.disabled { cursor: not-allowed; opacity: .55; }
    .offers-hint { margin: 0 0 .6rem; font-size: .78rem; }
    .offers-group { margin: .9rem 0 .45rem; font-size: .76rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    .offers-hint + .offers-group { margin-top: 0; }
    .applied-shipping { display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; }
    .applied-shipping p { margin: 0; font-size: .8rem; }
    .link-button { border: 0; background: none; padding: 0; color: var(--muted); font: inherit; font-size: .78rem; text-decoration: underline; cursor: pointer; }
    .dialog-foot .secondary { flex-shrink: 0; white-space: nowrap; }
    .confirm-body dl { margin: 0; display: grid; gap: .5rem; }
    .confirm-lead { margin: 0 0 .85rem; font-size: .9rem; }
    .confirm-row { gap: 1rem; font-size: .88rem; }
    .confirm-row dd { text-align: right; }
    .confirm-address dd { white-space: normal; }
    .confirm-items { display: grid; gap: .35rem; font-size: .88rem; }
    .confirm-items ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .3rem; max-height: 12rem; overflow-y: auto; }
    .confirm-items li { display: flex; justify-content: space-between; gap: 1rem; font-weight: 400; }
    .confirm-name { min-width: 0; overflow-wrap: anywhere; }
    .confirm-qty { flex-shrink: 0; font-weight: 700; }
    .confirm-money { border-top: 1px solid var(--line); padding-top: .5rem; }
    .dialog-foot { display: flex; justify-content: flex-end; gap: .5rem; padding: .75rem 1rem; border-top: 1px solid var(--line); }
    .offer-head { display: flex; justify-content: space-between; gap: .5rem; }
    .offer-code { font-family: var(--mono-font); letter-spacing: .04em; }
    .offer-amount, .offer-state { color: #205e4a; font-weight: 600; }
    .offer-reason { color: #9a3b26; }
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
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly wallets = inject(WalletApiService);
  @ViewChild('couponDialog') private couponDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLDialogElement>;

  preview: CheckoutPreview | null = null;
  /** The cart lines chosen in the cart (?items=1,2,3); empty buys the whole cart. */
  cartItemIds: number[] = [];
  addresses: CustomerAddress[] = [];
  addressId: number | null = null;
  /** The customer's pick per shop (vendor id to rate id). */
  choices: Record<number, number> = {};
  paymentMethod: string | null = null;
  readonly walletMethod = WALLET_METHOD;
  /** The wallet balance, to show next to the wallet and to keep it from paying more than it holds; null until known. */
  walletBalance: number | null = null;
  /** What the customer is typing, and the code that was sent with the last request. */
  couponInput = '';
  /** The item code and the shipping code sent with the last request; an order can carry one of each. */
  appliedCode: string | null = null;
  appliedShippingCode: string | null = null;
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
    this.cartItemIds = (this.route.snapshot.queryParamMap.get('items') ?? '')
      .split(',').map(Number).filter(id => Number.isInteger(id) && id > 0);
    this.loadWallet();
    this.start();
  }

  /** The balance is only a hint here: the server takes the money and refuses when it is short. */
  loadWallet() {
    this.wallets.get().subscribe({ next: wallet => this.walletBalance = wallet.balance, error: () => this.walletBalance = null });
  }

  /** The wallet cannot pay this order: its balance is below the total. */
  walletShort(method: string | null) {
    const total = this.preview?.total;
    return method === WALLET_METHOD && this.walletBalance !== null && total !== null && total !== undefined && this.walletBalance < total;
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

  methodName(systemName: string, serverName: string) { return paymentMethodName(systemName, serverName); }

  problemKey(problem: CheckoutProblem) { return PROBLEM_KEY[problem]; }

  hasProblem(problem: CheckoutProblem) { return !!this.preview?.problems.includes(problem); }

  cartProblem(): CheckoutProblem | null {
    return CART_PROBLEMS.find(p => this.hasProblem(p)) ?? null;
  }

  otherProblems(): CheckoutProblem[] {
    return (this.preview?.problems ?? []).filter(p => !CART_PROBLEMS.includes(p) && p !== 'address_invalid' && p !== 'address_area_missing'
      && p !== 'coupon_invalid' && p !== 'shipping_coupon_invalid');
  }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  daysText(option: ShippingOption) {
    // GHN's own window comes first: "Expected 21/10 – 22/10".
    if (option.estimatedFromUtc || option.estimatedToUtc) {
      const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const from = day((option.estimatedFromUtc ?? option.estimatedToUtc)!);
      const to = day((option.estimatedToUtc ?? option.estimatedFromUtc)!);
      return from === to
        ? this.transloco.translate('storefront.checkout.expectedOn', { date: from })
        : this.transloco.translate('storefront.checkout.expectedBetween', { from, to });
    }
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

  /**
   * Applies the typed code to its own kind: a code listed as a shipping code goes to shipping, any other to the items. A code that is not
   * listed and turns out to be a shipping code is moved by the next preview (see `moveWrongKind`).
   */
  applyCoupon() {
    const code = this.couponInput.trim().toUpperCase();
    if (!code) return;
    this.clearMessages();
    if (this.preview?.coupons.find(c => c.code === code && isShipping(c))) {
      this.appliedShippingCode = code;
      this.couponInput = '';
    } else {
      this.couponInput = code;
      this.appliedCode = code;
    }
    this.refresh();
  }

  usableCoupons() { return this.preview?.coupons.filter(c => c.amount !== null).length ?? 0; }

  /** Shipping codes first, then item codes. */
  offerGroups(): { kind: DiscountKind; offers: CheckoutCoupon[] }[] {
    const coupons = this.preview?.coupons ?? [];
    return [
      { kind: 'shipping', offers: coupons.filter(c => isShipping(c)) },
      { kind: 'product', offers: coupons.filter(c => !isShipping(c)) }
    ];
  }

  /** The codes ticked in the dialog, one of each kind, not yet used. The dialog opens with the codes in use ticked. */
  pendingCode: string | null = null;
  pendingShippingCode: string | null = null;

  openCoupons() {
    const usable = (code: string | null) => this.preview?.coupons.find(c => c.code === code && c.amount !== null)?.code ?? null;
    this.pendingCode = usable(this.appliedCode);
    this.pendingShippingCode = usable(this.appliedShippingCode);
    this.couponDialog?.nativeElement.showModal();
  }

  isTicked(offer: CheckoutCoupon) { return offer.code === (isShipping(offer) ? this.pendingShippingCode : this.pendingCode); }

  isApplied(offer: CheckoutCoupon) { return offer.code === (isShipping(offer) ? this.appliedShippingCode : this.appliedCode); }

  /** Usable, and no other code of its kind is ticked: one code of each kind per order. */
  canTick(offer: CheckoutCoupon) {
    const ticked = isShipping(offer) ? this.pendingShippingCode : this.pendingCode;
    return offer.amount !== null && (ticked === null || ticked === offer.code);
  }

  /** Ticking the ticked code again unticks it, so another one of its kind can be chosen. */
  tick(offer: CheckoutCoupon) {
    if (!this.canTick(offer)) return;
    const next = this.isTicked(offer) ? null : offer.code;
    if (isShipping(offer)) this.pendingShippingCode = next;
    else this.pendingCode = next;
  }

  /** Uses the ticked codes (a kind with nothing ticked loses its code) and closes the dialog. */
  useCode() {
    this.closeCoupons();
    if (this.pendingCode === this.appliedCode && this.pendingShippingCode === this.appliedShippingCode) return;
    this.clearMessages();
    this.appliedCode = this.pendingCode;
    this.appliedShippingCode = this.pendingShippingCode;
    this.couponInput = this.appliedCode ?? '';
    this.refresh();
  }

  closeCoupons() { this.couponDialog?.nativeElement.close(); }

  /** A click on the dim backdrop (the dialog element itself, outside its content) closes it. */
  closeOnBackdrop(event: MouseEvent) {
    if (event.target === this.couponDialog?.nativeElement) this.closeCoupons();
  }

  offerSummary(offer: CheckoutCoupon) {
    if (offer.type === 'fixed') return this.transloco.translate('storefront.checkout.coupon.fixedOff', { amount: this.money(offer.value) });
    return offer.maxDiscountAmount === null
      ? this.transloco.translate('storefront.checkout.coupon.percentOff', { value: offer.value })
      : this.transloco.translate('storefront.checkout.coupon.percentOffCapped', { value: offer.value, cap: this.money(offer.maxDiscountAmount) });
  }

  offerScope(offer: CheckoutCoupon) {
    if (offer.vendorId === null) return this.transloco.translate('storefront.checkout.coupon.platformCode');
    const shop = this.preview?.cart.groups.find(g => g.vendorId === offer.vendorId)?.vendorName;
    return this.transloco.translate('storefront.checkout.coupon.shopCode', { shop: shop ?? '' });
  }

  removeCoupon() {
    this.clearMessages();
    this.appliedCode = null;
    this.couponInput = '';
    this.refresh();
  }

  removeShippingCoupon() {
    this.clearMessages();
    this.appliedShippingCode = null;
    this.refresh();
  }

  /** A typed shipping code sent as an item code comes back as the wrong kind: it moves to shipping, once. True when it moved. */
  private moveWrongKind(preview: CheckoutPreview): boolean {
    if (preview.couponReason !== 'wrong_kind' || !this.appliedCode || this.appliedShippingCode) return false;
    this.appliedShippingCode = this.appliedCode;
    this.appliedCode = null;
    this.couponInput = '';
    return true;
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
      couponCode: this.appliedCode,
      shippingCouponCode: this.appliedShippingCode,
      cartItemIds: this.cartItemIds.length ? this.cartItemIds : null
    }).subscribe({
      next: preview => {
        this.refreshing = false;
        this.loading = false;
        this.preview = preview;
        // The page pre-selects the cheapest option and the first payment method, so the customer sees what will be sent.
        if (this.moveWrongKind(preview) || this.applyDefaults(preview)) this.refresh();
      },
      error: err => {
        this.refreshing = false;
        this.loading = false;
        this.loadError = vendorErrorMessage(err, this.transloco.translate('storefront.checkout.errors.load'));
      }
    });
  }

  selectedAddress() { return this.addresses.find(a => a.id === this.addressId) ?? null; }

  selectedPaymentName() {
    if (!this.paymentMethod) return null;
    return paymentMethodName(this.paymentMethod, this.preview?.paymentMethods.find(m => m.systemName === this.paymentMethod)?.displayName);
  }

  /** "Place order" opens the confirmation first; the order is only sent from there. */
  openConfirm() {
    if (!this.preview?.canPlace || this.placing || this.refreshing || !this.acceptedTerms || this.walletShort(this.paymentMethod)) return;
    this.confirmDialog?.nativeElement.showModal();
  }

  closeConfirm() { this.confirmDialog?.nativeElement.close(); }

  closeConfirmOnBackdrop(event: MouseEvent) {
    if (event.target === this.confirmDialog?.nativeElement) this.closeConfirm();
  }

  confirmPlace() {
    this.closeConfirm();
    this.place();
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
      shippingCouponCode: this.appliedShippingCode,
      cartItemIds: this.cartItemIds.length ? this.cartItemIds : null,
      idempotencyKey: this.key,
      acceptedTerms: this.acceptedTerms,
      note: this.note.trim() || null
    }).subscribe({
      next: placed => {
        this.placing = false;
        // What was bought left the cart: the header follows.
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
        // Paying from the wallet may have been refused for its balance: show the balance as it is now.
        if (this.paymentMethod === WALLET_METHOD) this.loadWallet();
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
