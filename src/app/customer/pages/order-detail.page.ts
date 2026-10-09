import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { OrderStatusBadgeComponent } from '../../shared/components/order-status-badge/order-status-badge.component';
import { ShopOrderPanelComponent } from '../../shared/components/shop-order-panel/shop-order-panel.component';
import { CurrencyService } from '../../core/money/currency.service';
import { CheckoutApiService } from '../../core/checkout/checkout-api.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { OrderDetail, ShopOrderDetail } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** One order of the customer: the recipient, and each shop order with what the customer may still do with it. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, OrderStatusBadgeComponent, ShopOrderPanelComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page">
      <p><a routerLink="/customer/orders">← {{ t('orders.customer.title') }}</a></p>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (notFound) {
        <p class="state" role="alert">{{ t('common.states.notFound') }}</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
        <button type="button" class="secondary" (click)="load()">{{ t('common.actions.retry') }}</button>
      } @else if (order) {
        @if (order.awaitingPayment) {
          <div class="banner banner-wait" role="status">
            <span>{{ returned ? t('orders.customer.confirming') : t('orders.customer.awaitingPayment') }}</span>
            <span class="row">
              <button type="button" class="primary" (click)="payNow()" [disabled]="busy">{{ t('orders.customer.payNow') }}</button>
              <button type="button" class="secondary" (click)="load()" [disabled]="busy">{{ t('orders.customer.refresh') }}</button>
            </span>
          </div>
        } @else if (returned) {
          <p class="banner banner-ok" role="status">{{ t('orders.customer.paid') }}</p>
        } @else if (placed) {
          <p class="banner banner-ok" role="status">{{ t('orders.customer.placed') }}</p>
        }
        <div class="head">
          <div>
            <div class="eyebrow">{{ t('orders.customer.order') }}</div>
            <h1>{{ order.number }}</h1>
            <span class="muted">{{ order.createdOnUtc | date: 'medium' }} · {{ order.paymentMethod }}</span>
          </div>
          <app-order-status-badge [status]="order.status" />
        </div>

        <section class="recipient">
          <h2>{{ t('orders.recipient') }}</h2>
          <p>
            <strong>{{ order.recipient.name }}</strong> · {{ order.recipient.phone }}<br />
            {{ order.recipient.address1 }}@if (order.recipient.address2) {, {{ order.recipient.address2 }}}<br />
            {{ order.recipient.city }}@if (order.recipient.stateProvince) {, {{ order.recipient.stateProvince }}}
            @if (order.recipient.postalCode) { {{ order.recipient.postalCode }}}, {{ order.recipient.countryCode }}
          </p>
          @if (order.customerNote) { <p class="muted">{{ t('orders.note') }}: {{ order.customerNote }}</p> }
        </section>

        @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

        @for (shop of order.shopOrders; track shop.id) {
          <app-shop-order-panel [order]="shop">
            @if (shop.status === 'pending') {
              @if (cancelling?.id === shop.id) {
                <div class="reason">
                  <label [attr.for]="'reason-' + shop.id">{{ t('orders.reason') }}</label>
                  <textarea [id]="'reason-' + shop.id" [(ngModel)]="reason" name="reason" rows="2" maxlength="500"></textarea>
                  <div class="row">
                    <button type="button" class="danger" (click)="cancel(shop)" [disabled]="busy">{{ t('orders.confirmCancel') }}</button>
                    <button type="button" class="secondary" (click)="cancelling = null">{{ t('common.actions.cancel') }}</button>
                  </div>
                </div>
              } @else {
                <button type="button" class="secondary" (click)="startCancel(shop)" [disabled]="busy">{{ t('orders.cancelShopOrder') }}</button>
              }
            }
            <!-- Once the shop marked it delivered, the customer confirms receipt: the shop order is completed (a return can still be asked within the return window). -->
            @if (shop.status === 'delivered') {
              <div class="receipt">
                <button type="button" class="primary" (click)="receive(shop)" [disabled]="busy">{{ t('orders.confirmReceipt') }}</button>
                <span class="muted">{{ t('orders.confirmReceiptNote') }}</span>
              </div>
            }
            @if (shop.status === 'delivered' || shop.status === 'completed') {
              <a class="secondary" [routerLink]="['/customer/returns/new', order.id, shop.id]">{{ t('returns.customer.requestReturn') }}</a>
            }
          </app-shop-order-panel>
        }

        <dl class="totals">
          <div><dt>{{ t('orders.subtotal') }}</dt><dd>{{ money(order.subtotal) }}</dd></div>
          @if (order.discountTotal > 0) {
            <div class="discount"><dt>{{ t('orders.discount') }} ({{ order.discountCode }})</dt><dd>−{{ money(order.discountTotal) }}</dd></div>
          }
          <div><dt>{{ t('orders.shipping') }}</dt><dd>{{ money(order.shippingTotal) }}</dd></div>
          @if (order.taxTotal > 0) {
            <div><dt>{{ t('orders.tax') }}</dt><dd>{{ money(order.taxTotal) }}</dd></div>
          }
          <div class="grand"><dt>{{ t('orders.total') }}</dt><dd>{{ money(order.total) }}</dd></div>
        </dl>
      }
    </div>
    </ng-container>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 2rem 0 5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: .75rem 0 .25rem; font: 700 clamp(1.8rem, 4vw, 2.8rem)/1 var(--display-font); }
    h2 { font-size: 1rem; margin: 0 0 .5rem; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
    .state { color: var(--muted); padding: 2rem 0; }
    .state-error { color: #8d3128; }
    .muted { color: var(--muted); font-size: .85rem; }
    .receipt { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .recipient { border: 1px solid var(--line); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
    .recipient p { margin: 0 0 .5rem; line-height: 1.5; }
    .banner { margin: 0 0 1rem; padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; font-size: .9rem; }
    .banner-ok { border-color: var(--green); background: #e5f0e9; color: #205e4a; }
    .banner-wait { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; border-color: #e3c987; background: #fbf3dc; color: #6b4a00; }
    .totals { margin: 1.5rem 0 0; display: grid; gap: .3rem; max-width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; }
    .totals dt { color: var(--muted); }
    .totals dd { margin: 0; }
    .discount dd { color: #205e4a; }
    .grand { font-weight: 700; border-top: 1px solid var(--line); padding-top: .4rem; }
    .reason { display: grid; gap: .5rem; width: 100%; }
    .reason textarea { border: 1px solid var(--line-strong); padding: .5rem; background: transparent; color: var(--ink); font: inherit; }
    .row { display: flex; gap: .5rem; }
    button { border: 1px solid var(--ink); padding: .45rem .9rem; font: 700 .8rem inherit; cursor: pointer; }
    button:disabled { opacity: .4; cursor: not-allowed; }
    .primary { background: var(--ink); color: var(--paper); }
    .secondary { background: transparent; color: var(--ink); }
    a.secondary { border: 1px solid var(--ink); padding: .45rem .9rem; font: 700 .8rem inherit; text-decoration: none; }
    .danger { background: #8d3128; border-color: #8d3128; color: #fff; }
  `]
})
export class OrderDetailPage implements OnInit {
  private readonly api = inject(OrderApiService);
  private readonly checkout = inject(CheckoutApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  order: OrderDetail | null = null;
  loading = true;
  notFound = false;
  loadError = '';
  actionError = '';
  busy = false;
  cancelling: ShopOrderDetail | null = null;
  reason = '';
  /** True right after checkout: the page says the order was placed. */
  placed = false;
  /** True when the gateway sent the customer back here after paying (or not paying). */
  returned = false;

  ngOnInit() {
    this.placed = this.route.snapshot.queryParamMap.get('placed') === '1';
    this.returned = this.route.snapshot.queryParamMap.get('payment') === 'return';
    this.currency.load();
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  load() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.notFound = false;
    this.loadError = '';
    this.api.myOrder(id).subscribe({
      next: order => { this.order = order; this.loading = false; },
      error: err => {
        this.loading = false;
        if (err?.status === 404) this.notFound = true;
        else this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.loadOne'));
      }
    });
  }

  /** Asks where this order is paid and goes there. The page address is only given while the payment is still pending. */
  payNow() {
    if (!this.order) return;
    this.busy = true;
    this.actionError = '';
    this.checkout.paymentStatus(this.order.id).subscribe({
      next: info => {
        this.busy = false;
        if (info.redirectUrl) { window.location.assign(info.redirectUrl); return; }
        // Nothing to pay any more (it was paid or failed meanwhile): show the order as it is now.
        this.load();
      },
      error: err => { this.busy = false; this.actionError = vendorErrorMessage(err, this.transloco.translate('orders.errors.action')); }
    });
  }

  startCancel(shop: ShopOrderDetail) {
    this.cancelling = shop;
    this.reason = '';
    this.actionError = '';
  }

  cancel(shop: ShopOrderDetail) {
    if (!this.reason.trim()) { this.actionError = this.transloco.translate('orders.errors.reasonRequired'); return; }
    this.run(this.api.cancelAsCustomer(shop.id, this.reason.trim()));
  }

  receive(shop: ShopOrderDetail) { this.run(this.api.confirmReceipt(shop.id)); }

  private run(request: ReturnType<OrderApiService['confirmReceipt']>) {
    this.busy = true;
    this.actionError = '';
    request.subscribe({
      next: () => { this.busy = false; this.cancelling = null; this.load(); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
        // The shop may have moved the order on meanwhile: show it as it is now.
        if (err?.status === 409 || err?.status === 404) { this.cancelling = null; this.load(); }
      }
    });
  }
}
