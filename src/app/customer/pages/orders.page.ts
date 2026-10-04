import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { OrderStatusBadgeComponent } from '../../shared/components/order-status-badge/order-status-badge.component';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { OrderSummary } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 10;

/** The signed-in customer's orders, newest first, each with the shop orders it was split into. */
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, EmptyStateComponent, OrderStatusBadgeComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page">
      <div class="eyebrow">{{ t('orders.customer.eyebrow') }}</div>
      <h1>{{ t('orders.customer.title') }}</h1>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
        <button type="button" class="secondary" (click)="goTo(page)">{{ t('common.actions.retry') }}</button>
      } @else if (orders.length === 0) {
        <app-empty-state [title]="t('orders.customer.emptyTitle')" [message]="t('orders.customer.emptyMessage')" mark="00" />
        <p class="center"><a routerLink="/storefront/products">{{ t('storefront.cart.browse') }} →</a></p>
      } @else {
        @for (order of orders; track order.id) {
          <article class="order">
            <header>
              <div>
                <a class="number" [routerLink]="['/customer/orders', order.id]">{{ order.number }}</a>
                <span class="muted">{{ order.createdOnUtc | date: 'medium' }}</span>
              </div>
              <div class="right">
                <strong>{{ money(order.total) }}</strong>
                <app-order-status-badge [status]="order.status" />
              </div>
            </header>
            <ul>
              @for (shop of order.shopOrders; track shop.id) {
                <li>
                  <span>{{ shop.shopName }} <span class="muted">· {{ t('orders.items', { count: shop.itemCount }) }}</span></span>
                  <span class="right"><span>{{ money(shop.total) }}</span><app-order-status-badge [status]="shop.status" /></span>
                </li>
              }
            </ul>
            <a class="secondary" [routerLink]="['/customer/orders', order.id]">{{ t('orders.customer.view') }}</a>
          </article>
        }
        <nav class="pager" [attr.aria-label]="t('orders.customer.title')">
          <button type="button" class="secondary" (click)="goTo(page - 1)" [disabled]="page <= 1">{{ t('common.actions.back') }}</button>
          <span>{{ t('orders.pageOf', { page: page, total: totalPages }) }}</span>
          <button type="button" class="secondary" (click)="goTo(page + 1)" [disabled]="page >= totalPages">{{ t('orders.next') }}</button>
        </nav>
      }
    </div>
    </ng-container>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 2rem 0 5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 1rem 0 2rem; font: 700 clamp(2rem, 5vw, 3.5rem)/1 var(--display-font); }
    .state { color: var(--muted); padding: 2rem 0; }
    .state-error { color: #8d3128; }
    .center { text-align: center; }
    .order { border: 1px solid var(--line); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; display: grid; gap: .75rem; }
    header, li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; font-size: .9rem; }
    .number { font-weight: 700; color: var(--ink); margin-right: .75rem; }
    .muted { color: var(--muted); font-size: .8rem; }
    .right { display: flex; align-items: center; gap: .75rem; }
    .secondary { justify-self: start; border: 1px solid var(--ink); padding: .4rem .9rem; background: transparent; color: var(--ink); font: 700 .8rem inherit; cursor: pointer; text-decoration: none; }
    .secondary:disabled { opacity: .4; cursor: not-allowed; }
    .pager { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
  `]
})
export class OrdersPage implements OnInit {
  private readonly api = inject(OrderApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  orders: OrderSummary[] = [];
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';

  ngOnInit() {
    this.currency.load();
    this.goTo(1);
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.api.myOrders(this.page, PAGE_SIZE).subscribe({
      next: result => { this.orders = result.items; this.totalPages = Math.max(result.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }
}
