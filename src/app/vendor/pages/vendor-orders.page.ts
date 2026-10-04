import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { SHOP_ORDER_STATUSES, ShopOrderFilter, ShopOrderListItem, ShopOrderStatus } from '../../core/orders/order.models';
import { OrderStatusBadgeComponent } from '../../shared/components/order-status-badge/order-status-badge.component';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

/** The shop orders of the member's shop, with a tab and a count per status. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, OrderStatusBadgeComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="orders-title">
      <div class="eyebrow">{{ t('vendor.orders.eyebrow') }}</div>
      <h1 id="orders-title">{{ t('vendor.orders.title') }}</h1>
      <p>{{ t('vendor.orders.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <div class="actions" role="tablist" [attr.aria-label]="t('vendor.orders.tabs')">
            <button type="button" role="tab" class="btn btn-small" [class.btn-secondary]="filter.status !== ''" [attr.aria-selected]="filter.status === ''" (click)="setStatus('')">
              {{ t('vendor.orders.all') }}
            </button>
            @for (s of statuses; track s) {
              <button type="button" role="tab" class="btn btn-small" [class.btn-secondary]="filter.status !== s" [attr.aria-selected]="filter.status === s" (click)="setStatus(s)">
                {{ t('orders.status.' + s) }} ({{ counts[s] ?? 0 }})
              </button>
            }
          </div>
        </div>
        <form class="panel-body" (ngSubmit)="search()">
          <div class="actions">
            <input type="search" name="search" [(ngModel)]="filter.search" [placeholder]="t('vendor.orders.searchPlaceholder')" [attr.aria-label]="t('vendor.orders.searchPlaceholder')" />
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
        } @else if (items.length === 0) {
          <p class="state">{{ t('vendor.orders.empty') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr>
                <th>{{ t('vendor.orders.number') }}</th><th>{{ t('vendor.orders.date') }}</th><th>{{ t('vendor.orders.recipient') }}</th>
                <th>{{ t('vendor.orders.itemCount') }}</th><th>{{ t('orders.total') }}</th><th>{{ t('vendor.orders.payment') }}</th><th>{{ t('admin.common.status') }}</th>
              </tr></thead>
              <tbody>
                @for (o of items; track o.id) {
                  <tr>
                    <td><a [routerLink]="['/vendor/orders', o.id]"><strong>{{ o.number }}</strong></a></td>
                    <td>{{ o.createdOnUtc | date: 'short' }}</td>
                    <td>{{ o.recipientName }}<div class="muted">{{ o.recipientPhone }}</div></td>
                    <td>{{ o.itemCount }}</td>
                    <td>{{ money(o.total) }}</td>
                    <td>{{ o.paymentMethod }}</td>
                    <td><app-order-status-badge [status]="o.status" /></td>
                  </tr>
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
    }
    </ng-container>
  `
})
export class VendorOrdersPage implements OnInit {
  private readonly api = inject(OrderApiService);
  private readonly auth = inject(AuthFacade);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly statuses = SHOP_ORDER_STATUSES;

  vendorId: number | null = null;
  items: ShopOrderListItem[] = [];
  counts: Partial<Record<ShopOrderStatus, number>> = {};
  filter: ShopOrderFilter = { status: '', search: '', from: '', to: '' };
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';

  ngOnInit() {
    this.currency.load();
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        this.goTo(1);
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  setStatus(status: ShopOrderStatus | '') {
    this.filter = { ...this.filter, status };
    this.goTo(1);
  }

  search() { this.goTo(1); }

  goTo(page: number) {
    if (!this.vendorId) return;
    const vendorId = this.vendorId;
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.api.shopCounts(vendorId).subscribe({ next: counts => { this.counts = counts; } });
    this.api.shopOrders(vendorId, this.filter, this.page, PAGE_SIZE).subscribe({
      next: result => { this.items = result.items; this.totalPages = Math.max(result.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }
}
