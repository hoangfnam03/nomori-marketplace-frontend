import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { OrderApiService } from '../../core/orders/order-api.service';
import { ShopOrderDetail } from '../../core/orders/order.models';
import { ShopOrderPanelComponent } from '../../shared/components/shop-order-panel/shop-order-panel.component';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

type Form = 'ship' | 'tracking' | 'cancel' | null;

/** One shop order of the member's shop: the recipient to send it to, and the steps the shop can take. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, ShopOrderPanelComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="order-title">
      <div class="eyebrow">{{ t('vendor.orders.eyebrow') }}</div>
      <h1 id="order-title">{{ order?.number ?? t('vendor.orders.title') }}</h1>
      <p><a routerLink="/vendor/orders">← {{ t('vendor.orders.title') }}</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else if (loading) {
      <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
    } @else if (notFound) {
      <div class="panel"><p class="state" role="alert">{{ t('common.states.notFound') }}</p></div>
    } @else if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
      </div></div>
    } @else if (order) {
      <div class="panel">
        <div class="panel-header"><h2>{{ t('orders.recipient') }}</h2></div>
        <div class="panel-body">
          <p>
            <strong>{{ order.recipient.name }}</strong> · {{ order.recipient.phone }}<br />
            {{ order.recipient.address1 }}@if (order.recipient.address2) {, {{ order.recipient.address2 }}}<br />
            {{ order.recipient.city }}@if (order.recipient.stateProvince) {, {{ order.recipient.stateProvince }}}
            @if (order.recipient.postalCode) { {{ order.recipient.postalCode }}}, {{ order.recipient.countryCode }}
          </p>
          @if (order.customerNote) { <p class="muted">{{ t('orders.note') }}: {{ order.customerNote }}</p> }
          <p class="muted">{{ t('vendor.orders.payment') }}: {{ order.paymentMethod }} · {{ t('vendor.orders.orderRef') }}: {{ order.orderNumber }}</p>
        </div>
      </div>

      <div class="panel"><div class="panel-body">
        @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
        <app-shop-order-panel [order]="order">
          @if (order.status === 'pending') {
            <button type="button" class="btn btn-small" (click)="confirm()" [disabled]="busy">{{ t('vendor.orders.confirm') }}</button>
          }
          @if (order.status === 'confirmed') {
            <button type="button" class="btn btn-small" (click)="open('ship')" [disabled]="busy">{{ t('vendor.orders.ship') }}</button>
          }
          @if (order.status === 'shipped') {
            <button type="button" class="btn btn-small" (click)="deliver()" [disabled]="busy">{{ t('vendor.orders.deliver') }}</button>
            <button type="button" class="btn btn-secondary btn-small" (click)="open('tracking')" [disabled]="busy">{{ t('vendor.orders.editTracking') }}</button>
          }
          @if (order.status === 'pending' || order.status === 'confirmed') {
            <button type="button" class="btn btn-danger btn-small" (click)="open('cancel')" [disabled]="busy">{{ t('orders.cancelShopOrder') }}</button>
          }
        </app-shop-order-panel>

        @if (form === 'ship' || form === 'tracking') {
          <form class="form" (ngSubmit)="saveShipping()" novalidate>
            <h3>{{ form === 'ship' ? t('vendor.orders.ship') : t('vendor.orders.editTracking') }}</h3>
            <div class="form-row">
              <label>{{ t('vendor.orders.carrier') }} *
                <input type="text" name="carrier" [(ngModel)]="carrier" maxlength="100" required />
                @if (fieldError('carrier'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              <label>{{ t('vendor.orders.trackingNumber') }} *
                <input type="text" name="trackingNumber" [(ngModel)]="trackingNumber" maxlength="100" required />
                @if (fieldError('trackingNumber'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
            </div>
            <div class="actions">
              <button type="submit" class="btn" [disabled]="busy">{{ t('common.actions.save') }}</button>
              <button type="button" class="btn btn-secondary" (click)="form = null">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }
        @if (form === 'cancel') {
          <form class="form" (ngSubmit)="cancel()" novalidate>
            <h3>{{ t('orders.cancelShopOrder') }}</h3>
            <label>{{ t('orders.reason') }} *
              <textarea name="reason" [(ngModel)]="reason" rows="3" maxlength="500" required></textarea>
              @if (fieldError('reason'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <div class="actions">
              <button type="submit" class="btn btn-danger" [disabled]="busy">{{ t('orders.confirmCancel') }}</button>
              <button type="button" class="btn btn-secondary" (click)="form = null">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }
      </div></div>
    }
    </ng-container>
  `
})
export class VendorOrderDetailPage implements OnInit {
  private readonly api = inject(OrderApiService);
  private readonly auth = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  vendorId: number | null = null;
  order: ShopOrderDetail | null = null;
  loading = true;
  notFound = false;
  loadError = '';
  actionError = '';
  busy = false;
  form: Form = null;
  carrier = '';
  trackingNumber = '';
  reason = '';
  fieldErrors: Record<string, string[]> = {};

  ngOnInit() { this.load(); }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  load() {
    this.loading = true;
    this.notFound = false;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        this.api.shopOrder(this.vendorId, Number(this.route.snapshot.paramMap.get('id'))).subscribe({
          next: order => { this.order = order; this.loading = false; },
          error: err => {
            this.loading = false;
            if (err?.status === 404) this.notFound = true;
            else this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.loadOne'));
          }
        });
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  open(form: Form) {
    this.form = form;
    this.fieldErrors = {};
    this.actionError = '';
    this.reason = '';
    // Editing tracking starts from what is there now.
    this.carrier = form === 'tracking' ? this.order?.carrier ?? '' : '';
    this.trackingNumber = form === 'tracking' ? this.order?.trackingNumber ?? '' : '';
  }

  confirm() { this.run(id => this.api.confirm(this.vendorId!, id)); }

  deliver() { this.run(id => this.api.deliver(this.vendorId!, id)); }

  saveShipping() {
    const body = { carrier: this.carrier.trim(), trackingNumber: this.trackingNumber.trim() };
    this.run(id => this.form === 'ship' ? this.api.ship(this.vendorId!, id, body) : this.api.updateTracking(this.vendorId!, id, body));
  }

  cancel() { this.run(id => this.api.cancelAsShop(this.vendorId!, id, this.reason.trim())); }

  private run(request: (id: number) => ReturnType<OrderApiService['shopOrder']>) {
    if (!this.vendorId || !this.order) return;
    this.busy = true;
    this.actionError = '';
    this.fieldErrors = {};
    request(this.order.id).subscribe({
      next: order => { this.busy = false; this.order = order; this.form = null; },
      error: err => {
        this.busy = false;
        if (err?.status === 400 && err?.fieldErrors) { this.fieldErrors = err.fieldErrors; return; }
        this.actionError = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
        // The customer may have cancelled meanwhile: show the order as it is now.
        if (err?.status === 409) { this.form = null; this.refresh(); }
      }
    });
  }

  private refresh() {
    if (!this.vendorId || !this.order) return;
    this.api.shopOrder(this.vendorId, this.order.id).subscribe({ next: order => { this.order = order; } });
  }
}
