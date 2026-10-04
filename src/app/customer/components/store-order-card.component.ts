import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CartService } from '../../core/cart/cart.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { historyLine, reasonLabel } from '../../core/orders/order-history';
import { CANCEL_REASONS, CancelReason, Order, ORDER_ERRORS, StoreOrder, StoreOrderEvent } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/**
 * One shop's part of an order, with what the customer can do to it: cancel while pending, confirm receipt once shipped,
 * buy again once finished. Used by "My orders" and by the order detail (which also shows the history).
 */
@Component({
  selector: 'app-store-order-card',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TranslocoDirective],
  template: `
    <article class="card" *transloco="let t">
      <header>
        <a class="shop" [routerLink]="['/storefront/vendors', storeOrder.vendorId]">{{ storeOrder.vendorName ?? t('admin.catalog.shop') }}</a>
        <span class="status" [attr.data-status]="storeOrder.status">{{ t('orders.status.' + storeOrder.status) }}</span>
      </header>
      @if (showOrderLink) {
        <div class="meta">
          <a [routerLink]="['/customer/orders', storeOrder.orderId]">{{ t('orders.orderNumber', { number: storeOrder.subOrderNumber }) }}</a>
          · {{ storeOrder.createdOnUtc | date: 'dd/MM/yyyy HH:mm' }}
        </div>
      } @else {
        <div class="meta">{{ t('orders.orderNumber', { number: storeOrder.subOrderNumber }) }}</div>
      }

      @for (item of storeOrder.items; track item.id) {
        <div class="item">
          @if (media.url(item.pictureId); as url) { <img [src]="url" alt="" width="56" height="56" loading="lazy" /> } @else { <span class="thumb-empty" aria-hidden="true"></span> }
          <div>
            <a class="name" [routerLink]="['/storefront/products', item.productId]">{{ item.productName }}</a>
            @if (item.variantDescription) { <div class="muted">{{ item.variantDescription }}</div> }
            <div class="muted">× {{ item.quantity }}</div>
          </div>
          <span class="price">{{ money(item.lineTotal) }}</span>
        </div>
      }

      @if (storeOrder.trackingNumber) {
        <p class="muted">{{ t('orders.tracking', { carrier: storeOrder.carrier ?? '', number: storeOrder.trackingNumber }) }}</p>
      }
      @if (storeOrder.status === 'cancelled') {
        <p class="muted">{{ cancelText(storeOrder) }}</p>
      }
      @if (showDetails && storeOrder.customerNote) {
        <p class="muted">{{ t('orders.yourNote', { note: storeOrder.customerNote }) }}</p>
      }

      <div class="totals">
        @if (showDetails) {
          <span class="muted">{{ t('checkout.shipping') }}: {{ storeOrder.shippingFee === 0 ? t('checkout.free') : money(storeOrder.shippingFee) }}</span>
        }
        <span>{{ t('orders.total') }} <strong>{{ money(storeOrder.total) }}</strong></span>
      </div>

      @if (showDetails && storeOrder.events.length) {
        <ol class="history" [attr.aria-label]="t('orders.history')">
          @for (e of storeOrder.events; track $index) {
            <li><span class="when">{{ e.createdOnUtc | date: 'dd/MM/yyyy HH:mm' }}</span> {{ history(e) }}</li>
          }
        </ol>
      }

      @if (error) { <p class="error" role="alert">{{ error }}</p> }
      @if (message) { <p class="message" role="status">{{ message }}</p> }

      @if (cancelling) {
        <form class="cancel-form" (ngSubmit)="confirmCancel()" [attr.aria-label]="t('orders.cancelTitle')">
          <strong>{{ t('orders.cancelTitle') }}</strong>
          @for (r of reasons; track r) {
            <label><input type="radio" name="reason-{{ storeOrder.id }}" [value]="r" [(ngModel)]="reason" /> {{ t('orders.cancelReason.' + r) }}</label>
          }
          @if (reason === 'other') {
            <textarea rows="2" maxlength="500" name="note" [(ngModel)]="note" [placeholder]="t('orders.cancelNotePlaceholder')"></textarea>
          }
          <div class="actions">
            <button type="submit" class="danger" [disabled]="busy || !reason || (reason === 'other' && !note.trim())">{{ t('orders.confirmCancel') }}</button>
            <button type="button" class="secondary" (click)="cancelling = false" [disabled]="busy">{{ t('orders.keepOrder') }}</button>
          </div>
        </form>
      } @else {
        <div class="actions">
          @if (storeOrder.canConfirmReceipt) {
            <button type="button" class="primary" (click)="confirmReceipt()" [disabled]="busy">{{ t('orders.received') }}</button>
          }
          @if (storeOrder.canCancel) {
            <button type="button" class="secondary" (click)="cancelling = true; error = ''" [disabled]="busy">{{ t('orders.cancel') }}</button>
          }
          @if (storeOrder.canReorder) {
            <button type="button" class="secondary" (click)="reorder()" [disabled]="busy">{{ t('orders.reorder') }}</button>
          }
          @if (showOrderLink) {
            <a class="link" [routerLink]="['/customer/orders', storeOrder.orderId]">{{ t('orders.viewDetails') }}</a>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    .card { border: 1px solid var(--line); padding: 1rem; background: rgba(255,255,255,.35); display: grid; gap: .6rem; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .shop { color: var(--ink); font-weight: 700; }
    .status { font: 700 .7rem var(--mono-font); letter-spacing: .08em; text-transform: uppercase; color: var(--green); }
    .status[data-status="cancelled"] { color: #8d3128; }
    .status[data-status="pending"] { color: #8a5a00; }
    .meta, .muted { color: var(--muted); font-size: .8rem; }
    .meta a { color: inherit; }
    .item { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: .8rem; align-items: center; padding: .4rem 0; border-top: 1px solid var(--line); }
    .item img, .thumb-empty { width: 56px; height: 56px; object-fit: cover; background: #e4e8df; display: block; }
    .name { color: var(--ink); font-weight: 600; text-decoration: none; }
    .name:hover { color: var(--green); }
    .price { white-space: nowrap; }
    .totals { display: flex; justify-content: flex-end; align-items: baseline; gap: 1.25rem; border-top: 1px solid var(--line); padding-top: .6rem; }
    .history { margin: 0; padding-left: 1.1rem; display: grid; gap: .3rem; font-size: .85rem; }
    .when { color: var(--muted); font-family: var(--mono-font); font-size: .75rem; margin-right: .4rem; }
    .actions { display: flex; gap: .6rem; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
    .primary, .secondary, .danger { padding: .5rem .9rem; font: 700 .8rem inherit; cursor: pointer; border: 1px solid var(--ink); }
    .primary { background: var(--ink); color: var(--paper); }
    .secondary { background: transparent; color: var(--ink); }
    .danger { background: #8d3128; border-color: #8d3128; color: #fff; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    .link { color: var(--green); font-size: .85rem; }
    .cancel-form { display: grid; gap: .45rem; padding: .8rem; border: 1px solid var(--line-strong); font-size: .9rem; }
    .cancel-form textarea { border: 1px solid var(--line-strong); padding: .5rem; background: var(--paper); color: var(--ink); font: inherit; }
    .error { color: #8d3128; font-size: .85rem; margin: 0; }
    .message { color: #205e4a; font-size: .85rem; margin: 0; }
  `]
})
export class StoreOrderCardComponent {
  private readonly orders = inject(OrderApiService);
  private readonly cart = inject(CartService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  readonly media = inject(MediaApiService);

  @Input({ required: true }) storeOrder!: StoreOrder;
  /** In "My orders" the card links to its order; on the order page it shows shipping, the note and the history instead. */
  @Input() showOrderLink = false;
  @Input() showDetails = false;
  /** The whole order after a cancellation or a confirmed receipt. */
  @Output() changed = new EventEmitter<Order>();

  readonly reasons = CANCEL_REASONS;
  cancelling = false;
  reason: CancelReason | null = null;
  note = '';
  busy = false;
  error = '';
  message = '';

  money(value: number) { return this.currency.formatPrimary(value); }

  reasonText(reason: string, note: string | null) { return reasonLabel(reason, note, this.t); }

  history(e: StoreOrderEvent) { return historyLine(e, 'customer', this.t); }

  private readonly t = (key: string, params?: Record<string, unknown>) => this.transloco.translate(key, params);

  cancelText(s: StoreOrder) {
    const by = s.cancelledBy ? this.transloco.translate('orders.actor.' + s.cancelledBy) : '';
    const why = s.cancelReason ? this.reasonText(s.cancelReason, s.cancelNote) : '';
    return this.transloco.translate('orders.cancelledBy', { actor: by }) + (why ? ` — ${why}` : '');
  }

  confirmCancel() {
    if (!this.reason) return;
    this.run(this.orders.cancel(this.storeOrder.id, this.reason, this.reason === 'other' ? this.note.trim() : null));
  }

  confirmReceipt() {
    this.run(this.orders.confirmReceipt(this.storeOrder.id));
  }

  reorder() {
    this.busy = true;
    this.error = '';
    this.message = '';
    this.orders.reorder(this.storeOrder.id).subscribe({
      next: result => {
        this.busy = false;
        this.cart.count.set(result.cartCount);
        if (result.failed.length === 0) {
          this.router.navigate(['/storefront/cart']);
          return;
        }
        // Some items could not be added: say which, and let the customer go to the cart when they are ready.
        const names = result.failed.map(f => f.productName).join(', ');
        if (result.addedProductIds.length) this.message = this.transloco.translate('orders.reorderPartial', { names });
        else this.error = this.transloco.translate('orders.reorderNone', { names });
      },
      error: err => { this.busy = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.action')); }
    });
  }

  private run(request: ReturnType<OrderApiService['cancel']>) {
    this.busy = true;
    this.error = '';
    this.message = '';
    request.subscribe({
      next: order => { this.busy = false; this.cancelling = false; this.changed.emit(order); },
      error: err => {
        this.busy = false;
        // The shop acted first (for example confirmed the order): reload so the customer sees the new state.
        if (err?.message === ORDER_ERRORS.concurrentUpdate || err?.message === ORDER_ERRORS.invalidTransition) {
          this.cancelling = false;
          this.error = this.transloco.translate('orders.changedMeanwhile');
          this.orders.get(this.storeOrder.orderId).subscribe({ next: order => this.changed.emit(order), error: () => undefined });
          return;
        }
        this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
      }
    });
  }
}
