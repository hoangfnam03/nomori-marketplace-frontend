import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { actorLabel, historyLine, reasonLabel } from '../../core/orders/order-history';
import { CARRIERS, Order, ORDER_ERRORS, StoreOrder, StoreOrderEvent, VENDOR_CANCEL_REASONS, VendorCancelReason } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

type Panel = 'ship' | 'editShipment' | 'cancel' | null;

/** One order as the shop sees it (US-B2 to B5): its own part only, the recipient, and the actions its status allows. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro">
      <div class="eyebrow">{{ t('vendor.orders.title') }}</div>
      <h1>{{ storeOrder ? storeOrder.subOrderNumber : t('vendor.orders.title') }}</h1>
      <p><a routerLink="/vendor/orders">← {{ t('vendor.orders.backToList') }}</a></p>
    </section>

    @if (loading) {
      <div class="panel"><p class="state">{{ t('orders.loading') }}</p></div>
    } @else if (loadError) {
      <div class="panel"><p class="banner" role="alert">{{ loadError }}</p></div>
    } @else if (order && storeOrder) {
      @if (error) { <p class="banner" role="alert">{{ error }}</p> }
      @if (notice) { <p class="banner banner-ok" role="status">{{ notice }}</p> }

      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('vendor.orders.status.' + storeOrder.status) }}</h2>
          <span class="muted">{{ t('orders.placedOn', { date: (storeOrder.createdOnUtc | date: 'dd/MM/yyyy HH:mm') }) }}</span>
        </div>
        <div class="panel-body">
          @if (storeOrder.status === 'pending') {
            <p class="muted">{{ t('vendor.orders.confirmBy', { date: (storeOrder.confirmByUtc | date: 'dd/MM/yyyy HH:mm') }) }}</p>
          }
          @if (storeOrder.trackingNumber) {
            <p>{{ t('orders.tracking', { carrier: storeOrder.carrier ?? '', number: storeOrder.trackingNumber }) }}</p>
          }
          @if (storeOrder.status === 'cancelled') {
            <p class="muted">{{ t('orders.cancelledBy', { actor: cancelledBy() }) }}
              @if (storeOrder.cancelReason) { — {{ reasonText(storeOrder.cancelReason, storeOrder.cancelNote) }} }</p>
          }

          @if (panel === 'ship' || panel === 'editShipment') {
            <form class="form" (ngSubmit)="submitShipment()" [attr.aria-label]="t('vendor.orders.shipTitle')">
              <div class="form-row">
                <label>{{ t('vendor.orders.carrier') }} *
                  <select name="carrier" [(ngModel)]="carrier" required>
                    <option value="">{{ t('customer.settings.choose') }}</option>
                    @for (c of carriers; track c) { <option [value]="c">{{ c }}</option> }
                    <option value="other">{{ t('vendor.orders.otherCarrier') }}</option>
                  </select>
                  @if (fieldErrors['carrier']) { <span class="field-error">{{ fieldErrors['carrier'][0] }}</span> }
                </label>
                @if (carrier === 'other') {
                  <label>{{ t('vendor.orders.carrierName') }} *<input name="carrierOther" [(ngModel)]="carrierOther" maxlength="100" /></label>
                }
                <label>{{ t('vendor.orders.trackingNumber') }} *<input name="tracking" [(ngModel)]="trackingNumber" maxlength="100" required />
                  @if (fieldErrors['trackingNumber']) { <span class="field-error">{{ fieldErrors['trackingNumber'][0] }}</span> }
                </label>
              </div>
              <div class="actions">
                <button type="submit" class="btn" [disabled]="busy || !shipmentReady()">{{ panel === 'ship' ? t('vendor.orders.handToCarrier') : t('common.actions.save') }}</button>
                <button type="button" class="btn btn-secondary" (click)="panel = null" [disabled]="busy">{{ t('common.actions.cancel') }}</button>
              </div>
            </form>
          } @else if (panel === 'cancel') {
            <form class="form" (ngSubmit)="submitCancel()" [attr.aria-label]="t('vendor.orders.cancelTitle')">
              <strong>{{ t('vendor.orders.cancelTitle') }}</strong>
              @for (r of reasons; track r) {
                <label class="check-label"><input type="radio" name="reason" [value]="r" [(ngModel)]="reason" /> {{ t('orders.cancelReason.' + r) }}</label>
              }
              <textarea name="note" rows="2" maxlength="500" [(ngModel)]="note" [placeholder]="t('vendor.orders.cancelNote')"></textarea>
              @if (fieldErrors['note']) { <span class="field-error">{{ fieldErrors['note'][0] }}</span> }
              <p class="muted">{{ t('vendor.orders.cancelHint') }}</p>
              <div class="actions">
                <button type="submit" class="btn btn-danger" [disabled]="busy || !reason || (reason === 'other' && !note.trim())">{{ t('vendor.orders.cancelOrder') }}</button>
                <button type="button" class="btn btn-secondary" (click)="panel = null" [disabled]="busy">{{ t('orders.keepOrder') }}</button>
              </div>
            </form>
          } @else {
            <div class="actions">
              @if (storeOrder.canConfirm) { <button type="button" class="btn" (click)="confirm()" [disabled]="busy">{{ t('vendor.orders.confirm') }}</button> }
              @if (storeOrder.canShip) { <button type="button" class="btn" (click)="openShipment('ship')" [disabled]="busy">{{ t('vendor.orders.ship') }}</button> }
              @if (storeOrder.canMarkDelivered) { <button type="button" class="btn" (click)="markDelivered()" [disabled]="busy">{{ t('vendor.orders.markDelivered') }}</button> }
              @if (storeOrder.canEditShipment) { <button type="button" class="btn btn-secondary" (click)="openShipment('editShipment')" [disabled]="busy">{{ t('vendor.orders.editShipment') }}</button> }
              @if (storeOrder.canCancel) { <button type="button" class="btn btn-secondary" (click)="openCancel()" [disabled]="busy">{{ t('vendor.orders.cancelOrder') }}</button> }
            </div>
          }
        </div>
      </div>

      <div class="columns">
        <div class="panel">
          <div class="panel-header"><h2>{{ t('vendor.orders.items') }}</h2></div>
          <div class="panel-body">
            @for (item of storeOrder.items; track item.id) {
              <div class="item">
                @if (media.url(item.pictureId); as url) { <img [src]="url" alt="" width="48" height="48" /> } @else { <span class="thumb-empty" aria-hidden="true"></span> }
                <div>
                  <strong>{{ item.productName }}</strong>
                  @if (item.variantDescription) { <div class="muted">{{ item.variantDescription }}</div> }
                  @if (item.sku) { <div class="muted">SKU {{ item.sku }}</div> }
                </div>
                <span>{{ money(item.unitPrice) }} × {{ item.quantity }}</span>
                <strong>{{ money(item.lineTotal) }}</strong>
              </div>
            }
            <dl class="detail-grid totals">
              <dt>{{ t('checkout.itemsTotal') }}</dt><dd>{{ money(storeOrder.itemsTotal) }}</dd>
              <dt>{{ t('checkout.shipping') }}</dt><dd>{{ money(storeOrder.shippingFee) }}</dd>
              <dt>{{ t('orders.total') }}</dt><dd><strong>{{ money(storeOrder.total) }}</strong></dd>
              <dt>{{ t('checkout.payment') }}</dt><dd>{{ t('checkout.cod') }} · {{ t('orders.payment.' + storeOrder.paymentStatus) }}</dd>
            </dl>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h2>{{ t('vendor.orders.recipient') }}</h2></div>
          <div class="panel-body">
            <p><strong>{{ order.shippingAddress.lastName }} {{ order.shippingAddress.firstName }}</strong><br />{{ order.shippingAddress.phoneNumber }}<br />{{ address() }}</p>
            @if (storeOrder.customerNote) { <p class="note">{{ t('vendor.orders.customerNote', { note: storeOrder.customerNote }) }}</p> }
          </div>
          <div class="panel-header"><h2>{{ t('orders.history') }}</h2></div>
          <div class="panel-body">
            <ol class="history">
              @for (e of storeOrder.events; track $index) {
                <li><span class="muted">{{ e.createdOnUtc | date: 'dd/MM/yyyy HH:mm' }}</span> {{ history(e) }}</li>
              }
            </ol>
          </div>
        </div>
      </div>
    }
    </ng-container>
  `,
  styles: [`
    .muted { color: var(--muted); font-size: .8rem; }
    .columns { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1rem; margin-top: 1rem; }
    .item { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto auto; gap: .8rem; align-items: center; padding: .5rem 0; border-bottom: 1px solid var(--line); }
    .item img, .thumb-empty { width: 48px; height: 48px; object-fit: cover; background: #e4e8df; display: block; }
    .totals { margin-top: 1rem; }
    .note { padding: .6rem .8rem; border-left: 3px solid var(--green); background: color-mix(in srgb, var(--green) 6%, transparent); }
    .history { margin: 0; padding-left: 1.1rem; display: grid; gap: .35rem; font-size: .85rem; }
    .form textarea, .form select { border: 1px solid var(--line-strong); padding: .5rem; background: var(--paper); color: var(--ink); font: inherit; }
    @media (max-width: 900px) { .columns { grid-template-columns: 1fr; } }
  `]
})
export class VendorOrderDetailPage implements OnInit {
  private readonly orders = inject(OrderApiService);
  private readonly auth = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);
  readonly media = inject(MediaApiService);

  readonly carriers = CARRIERS;
  readonly reasons = VENDOR_CANCEL_REASONS;
  vendorId: number | null = null;
  storeOrderId = 0;
  order: Order | null = null;
  loading = true;
  loadError = '';
  error = '';
  notice = '';
  busy = false;
  panel: Panel = null;
  carrier = '';
  carrierOther = '';
  trackingNumber = '';
  reason: VendorCancelReason | null = null;
  note = '';
  fieldErrors: Record<string, string[]> = {};

  get storeOrder(): StoreOrder | null { return this.order?.storeOrders[0] ?? null; }

  ngOnInit() {
    this.storeOrderId = Number(this.route.snapshot.paramMap.get('id'));
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.noShop'); return; }
        this.load();
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  address() {
    const a = this.order!.shippingAddress;
    return [a.address1, a.address2, a.city, a.stateProvince, a.zipPostalCode, a.countryCode].filter(Boolean).join(', ');
  }

  reasonText(reason: string, note: string | null) { return reasonLabel(reason, note, this.t); }

  history(e: StoreOrderEvent) { return historyLine(e, 'vendor', this.t); }

  /** Who cancelled, from the shop's point of view; the member's name comes from the cancellation event. */
  cancelledBy() {
    const s = this.storeOrder!;
    const event = [...s.events].reverse().find(e => e.toStatus === 'cancelled');
    return actorLabel(s.cancelledBy ?? 'system', 'vendor', this.t, event?.actorName);
  }

  private readonly t = (key: string, params?: Record<string, unknown>) => this.transloco.translate(key, params);

  openShipment(panel: 'ship' | 'editShipment') {
    const current = this.storeOrder?.carrier ?? '';
    this.carrier = !current ? '' : CARRIERS.includes(current) ? current : 'other';
    this.carrierOther = this.carrier === 'other' ? current : '';
    this.trackingNumber = this.storeOrder?.trackingNumber ?? '';
    this.fieldErrors = {};
    this.panel = panel;
  }

  openCancel() {
    this.reason = null;
    this.note = '';
    this.fieldErrors = {};
    this.panel = 'cancel';
  }

  shipmentReady() {
    const carrier = this.carrier === 'other' ? this.carrierOther.trim() : this.carrier;
    return !!carrier && !!this.trackingNumber.trim();
  }

  confirm() { this.run(this.orders.confirm(this.storeOrderId), 'vendor.orders.confirmedNotice'); }

  markDelivered() { this.run(this.orders.markDelivered(this.storeOrderId), 'vendor.orders.deliveredNotice'); }

  submitShipment() {
    if (!this.shipmentReady()) return;
    const carrier = this.carrier === 'other' ? this.carrierOther.trim() : this.carrier;
    this.run(this.orders.ship(this.storeOrderId, carrier, this.trackingNumber.trim()),
      this.panel === 'ship' ? 'vendor.orders.shippedNotice' : 'vendor.orders.shipmentSavedNotice');
  }

  submitCancel() {
    if (!this.reason) return;
    this.run(this.orders.vendorCancel(this.storeOrderId, this.reason, this.note.trim() || null), 'vendor.orders.cancelledNotice');
  }

  private load() {
    this.orders.vendorGet(this.vendorId!, this.storeOrderId).subscribe({
      next: order => { this.order = order; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }

  private run(request: Observable<Order>, noticeKey: string) {
    this.busy = true;
    this.error = '';
    this.notice = '';
    this.fieldErrors = {};
    request.subscribe({
      next: order => { this.busy = false; this.panel = null; this.order = order; this.notice = this.transloco.translate(noticeKey); },
      error: err => {
        this.busy = false;
        if (err?.status === 400 && err.fieldErrors) { this.fieldErrors = err.fieldErrors; return; }
        // The customer or the system changed the order first: show it as it is now.
        if (err?.message === ORDER_ERRORS.concurrentUpdate || err?.message === ORDER_ERRORS.invalidTransition) {
          this.panel = null;
          this.error = this.transloco.translate('orders.changedMeanwhile');
          this.load();
          return;
        }
        this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
      }
    });
  }
}
