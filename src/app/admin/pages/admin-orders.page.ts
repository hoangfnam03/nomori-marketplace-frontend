import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { OrderDetail, OrderSummary, SHOP_ORDER_STATUSES, ShopOrderDetail, ShopOrderFilter } from '../../core/orders/order.models';
import { OrderStatusBadgeComponent } from '../../shared/components/order-status-badge/order-status-badge.component';
import { ShopOrderPanelComponent } from '../../shared/components/shop-order-panel/shop-order-panel.component';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

/** Every order of the platform, with filters, and the one thing an administrator can do: cancel a shop order with a reason. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, OrderStatusBadgeComponent, ShopOrderPanelComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="orders-title">
      <div class="eyebrow">{{ t('admin.orders.eyebrow') }}</div>
      <h1 id="orders-title">{{ t('admin.orders.title') }}</h1>
      <p>{{ t('admin.orders.lede') }}</p>
    </section>

    <div class="panel">
      <form class="panel-body" (ngSubmit)="goTo(1)">
        <div class="actions">
          <select name="status" [(ngModel)]="filter.status" [attr.aria-label]="t('admin.common.status')">
            <option value="">{{ t('admin.payments.allStatuses') }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ t('orders.status.' + s) }}</option> }
          </select>
          <input type="number" min="1" name="vendorId" [(ngModel)]="vendorId" [placeholder]="t('admin.orders.shopId')" [attr.aria-label]="t('admin.orders.shopId')" style="width:8rem" />
          <input type="search" name="search" [(ngModel)]="filter.search" [placeholder]="t('admin.orders.searchPlaceholder')" [attr.aria-label]="t('admin.orders.searchPlaceholder')" />
          <label>{{ t('vendor.orders.from') }} <input type="date" name="from" [(ngModel)]="filter.from" /></label>
          <label>{{ t('vendor.orders.to') }} <input type="date" name="to" [(ngModel)]="filter.to" /></label>
          <button type="submit" class="btn btn-small">{{ t('vendor.orders.filter') }}</button>
        </div>
      </form>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="goTo(page)">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (orders.length === 0) {
        <p class="state">{{ t('admin.orders.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>{{ t('vendor.orders.number') }}</th><th>{{ t('vendor.orders.date') }}</th><th>{{ t('admin.orders.shops') }}</th>
              <th>{{ t('orders.total') }}</th><th>{{ t('admin.common.status') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (o of orders; track o.id) {
                <tr>
                  <td><strong>{{ o.number }}</strong></td>
                  <td>{{ o.createdOnUtc | date: 'short' }}</td>
                  <td>{{ shopNames(o) }}</td>
                  <td>{{ money(o.total) }}</td>
                  <td><app-order-status-badge [status]="o.status" />@if (o.awaitingPayment) { <div class="muted">{{ t('orders.customer.awaitingShort') }}</div> }</td>
                  <td><button type="button" class="btn btn-secondary btn-small" (click)="toggle(o)">{{ opened?.id === o.id ? t('admin.orders.hide') : t('admin.orders.open') }}</button></td>
                </tr>
                @if (opened?.id === o.id) {
                  <tr>
                    <td colspan="6">
                      @if (detailError) { <p class="banner" role="alert">{{ detailError }}</p> }
                      @if (opened) {
                        <p class="muted">{{ t('admin.orders.customerId') }}: {{ opened.customerId }} · {{ opened.recipient.name }} · {{ opened.recipient.phone }} · {{ opened.paymentMethod }}</p>
                        @for (shop of opened.shopOrders; track shop.id) {
                          <app-shop-order-panel [order]="shop">
                            @if (shop.status !== 'completed' && shop.status !== 'cancelled') {
                              @if (cancelling?.id === shop.id) {
                                <div class="form">
                                  <label>{{ t('orders.reason') }} *
                                    <textarea name="reason" [(ngModel)]="reason" rows="2" maxlength="500"></textarea>
                                  </label>
                                  <div class="actions">
                                    <button type="button" class="btn btn-danger btn-small" (click)="cancel(shop)" [disabled]="busy">{{ t('orders.confirmCancel') }}</button>
                                    <button type="button" class="btn btn-secondary btn-small" (click)="cancelling = null">{{ t('common.actions.cancel') }}</button>
                                  </div>
                                </div>
                              } @else {
                                <button type="button" class="btn btn-danger btn-small" (click)="startCancel(shop)" [disabled]="busy">{{ t('orders.cancelShopOrder') }}</button>
                              }
                            }
                          </app-shop-order-panel>
                        }
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page - 1)" [disabled]="page <= 1">{{ t('common.actions.back') }}</button>
          <span>{{ t('orders.pageOf', { page: page, total: totalPages }) }}</span>
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page + 1)" [disabled]="page >= totalPages">{{ t('orders.next') }}</button>
        </div>
      }
    </div>
    </ng-container>
  `
})
export class AdminOrdersPage implements OnInit {
  private readonly api = inject(OrderApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly statuses = SHOP_ORDER_STATUSES;

  orders: OrderSummary[] = [];
  filter: ShopOrderFilter = { status: '', search: '', from: '', to: '' };
  vendorId: number | null = null;
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';
  opened: OrderDetail | null = null;
  detailError = '';
  cancelling: ShopOrderDetail | null = null;
  reason = '';
  busy = false;

  ngOnInit() {
    this.currency.load();
    this.goTo(1);
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  shopNames(order: OrderSummary) { return order.shopOrders.map(s => s.shopName).join(', '); }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.opened = null;
    this.api.adminOrders(this.filter, this.vendorId, this.page, PAGE_SIZE).subscribe({
      next: result => { this.orders = result.items; this.totalPages = Math.max(result.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }

  toggle(order: OrderSummary) {
    if (this.opened?.id === order.id) { this.opened = null; return; }
    this.openOrder(order.id);
  }

  startCancel(shop: ShopOrderDetail) {
    this.cancelling = shop;
    this.reason = '';
    this.detailError = '';
  }

  cancel(shop: ShopOrderDetail) {
    if (!this.reason.trim()) { this.detailError = this.transloco.translate('orders.errors.reasonRequired'); return; }
    this.busy = true;
    this.detailError = '';
    this.api.cancelAsAdmin(shop.id, this.reason.trim()).subscribe({
      next: () => { this.busy = false; this.cancelling = null; if (this.opened) this.openOrder(this.opened.id); },
      error: err => {
        this.busy = false;
        this.detailError = vendorErrorMessage(err, this.transloco.translate('orders.errors.action'));
        // The shop order moved on meanwhile: show it as it is now.
        if (err?.status === 409 && this.opened) { this.cancelling = null; this.openOrder(this.opened.id, this.detailError); }
      }
    });
  }

  private openOrder(id: number, keepError = '') {
    this.detailError = keepError;
    this.api.adminOrder(id).subscribe({
      next: detail => {
        this.opened = detail;
        // The list shows the status of the whole order, so it follows the change.
        this.orders = this.orders.map(o => o.id === id ? { ...o, status: detail.status, shopOrders: o.shopOrders.map(s => ({ ...s, status: detail.shopOrders.find(d => d.id === s.id)?.status ?? s.status })) } : o);
      },
      error: err => { this.detailError = vendorErrorMessage(err, this.transloco.translate('orders.errors.loadOne')); }
    });
  }
}
