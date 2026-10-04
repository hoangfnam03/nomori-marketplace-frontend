import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { concatMap, from, last } from 'rxjs';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { CANCEL_REASONS, CancelReason, Order } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { StoreOrderCardComponent } from '../components/store-order-card.component';

/** One order: the address and payment as they were when it was placed, then each shop's part with its history. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StoreOrderCardComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <p class="back"><a routerLink="/customer/orders">← {{ t('orders.backToList') }}</a></p>

    @if (loading) {
      <p class="state">{{ t('orders.loading') }}</p>
    } @else if (error) {
      <p class="banner" role="alert">{{ error }}</p>
    } @else if (order) {
      <div class="page-heading">
        <div class="eyebrow">{{ t('orders.overall.' + order.overallStatus) }}</div>
        <h1>{{ t('orders.orderNumber', { number: order.orderNumber }) }}</h1>
        <p class="muted">{{ t('orders.placedOn', { date: (order.createdOnUtc | date: 'dd/MM/yyyy HH:mm') }) }}</p>
      </div>

      <div class="info">
        <section class="panel" aria-labelledby="ship-to">
          <h2 id="ship-to">{{ t('checkout.address') }}</h2>
          <p>
            <strong>{{ order.shippingAddress.lastName }} {{ order.shippingAddress.firstName }}</strong> · {{ order.shippingAddress.phoneNumber }}<br />
            {{ address() }}
          </p>
        </section>
        <section class="panel" aria-labelledby="payment">
          <h2 id="payment">{{ t('checkout.payment') }}</h2>
          <p>{{ t('checkout.cod') }}<br /><span class="muted">{{ t('orders.payment.' + order.paymentStatus) }}</span></p>
          <dl>
            <div><dt>{{ t('checkout.itemsTotal') }}</dt><dd>{{ money(order.itemsTotal) }}</dd></div>
            <div><dt>{{ t('checkout.shippingTotal') }}</dt><dd>{{ money(order.shippingTotal) }}</dd></div>
            <div class="grand"><dt>{{ t('checkout.total') }}</dt><dd>{{ money(order.total) }}</dd></div>
          </dl>
        </section>
      </div>

      @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
      @if (order.canCancelAll && order.storeOrders.length > 1) {
        @if (cancellingAll) {
          <form class="panel cancel-all" (ngSubmit)="cancelAll()">
            <strong>{{ t('orders.cancelAllTitle') }}</strong>
            @for (r of reasons; track r) {
              <label><input type="radio" name="reason" [value]="r" [(ngModel)]="reason" /> {{ t('orders.cancelReason.' + r) }}</label>
            }
            @if (reason === 'other') {
              <textarea rows="2" maxlength="500" name="note" [(ngModel)]="note" [placeholder]="t('orders.cancelNotePlaceholder')"></textarea>
            }
            <div class="actions">
              <button type="submit" class="danger" [disabled]="busy || !reason || (reason === 'other' && !note.trim())">{{ t('orders.confirmCancelAll') }}</button>
              <button type="button" class="secondary" (click)="cancellingAll = false" [disabled]="busy">{{ t('orders.keepOrder') }}</button>
            </div>
          </form>
        } @else {
          <div class="actions top"><button type="button" class="secondary" (click)="cancellingAll = true">{{ t('orders.cancelAll') }}</button></div>
        }
      }

      <div class="list">
        @for (s of order.storeOrders; track s.id) {
          <app-store-order-card [storeOrder]="s" [showDetails]="true" (changed)="order = $event" />
        }
      </div>
    }
    </ng-container>
  `,
  styles: [`
    :host { display: block; max-width: 900px; margin: 0 auto; padding-bottom: 4rem; }
    .back { margin-top: 2rem; }
    .back a { color: var(--muted); }
    .page-heading { padding: .5rem 0 1.5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: .75rem 0 .25rem; font: 700 clamp(2rem, 5vw, 3rem)/1 var(--display-font); }
    .muted { color: var(--muted); font-size: .85rem; }
    .state { color: var(--muted); padding: 2rem 0; }
    .banner { padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; }
    .info { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .panel { border: 1px solid var(--line); padding: 1rem; background: rgba(255,255,255,.35); }
    .panel h2 { margin: 0 0 .6rem; font: 700 1rem var(--display-font); }
    .panel p { margin: 0; line-height: 1.6; }
    dl { margin: .75rem 0 0; display: grid; gap: .35rem; }
    dl div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .grand { padding-top: .4rem; border-top: 1px solid var(--line); }
    .list { display: grid; gap: 1rem; }
    .actions { display: flex; gap: .6rem; justify-content: flex-end; flex-wrap: wrap; }
    .actions.top { margin-bottom: 1rem; }
    .cancel-all { display: grid; gap: .45rem; margin-bottom: 1rem; }
    .cancel-all textarea { border: 1px solid var(--line-strong); padding: .5rem; background: var(--paper); color: var(--ink); font: inherit; }
    .secondary, .danger { padding: .5rem .9rem; font: 700 .8rem inherit; cursor: pointer; border: 1px solid var(--ink); background: transparent; color: var(--ink); }
    .danger { background: #8d3128; border-color: #8d3128; color: #fff; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    @media (max-width: 700px) { .info { grid-template-columns: 1fr; } }
  `]
})
export class OrderDetailPage implements OnInit {
  private readonly orders = inject(OrderApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly reasons = CANCEL_REASONS;
  order: Order | null = null;
  loading = true;
  error = '';
  actionError = '';
  cancellingAll = false;
  reason: CancelReason | null = null;
  note = '';
  busy = false;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orders.get(id).subscribe({
      next: order => { this.order = order; this.loading = false; },
      error: err => { this.loading = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  address() {
    const a = this.order!.shippingAddress;
    return [a.address1, a.address2, a.city, a.stateProvince, a.zipPostalCode, a.countryCode].filter(Boolean).join(', ');
  }

  /** Cancels every shop order one after the other; stops at the first refusal and shows the order as it now is. */
  cancelAll() {
    if (!this.order || !this.reason) return;
    const reason = this.reason;
    const note = reason === 'other' ? this.note.trim() : null;
    this.busy = true;
    this.actionError = '';
    from(this.order.storeOrders.filter(s => s.canCancel))
      .pipe(concatMap(s => this.orders.cancel(s.id, reason, note)), last())
      .subscribe({
        next: order => { this.busy = false; this.cancellingAll = false; this.order = order; },
        error: err => {
          this.busy = false;
          this.cancellingAll = false;
          this.actionError = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
          this.orders.get(this.order!.id).subscribe({ next: order => this.order = order, error: () => undefined });
        }
      });
  }
}
