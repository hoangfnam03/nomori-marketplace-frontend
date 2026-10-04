import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { Order } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

@Component({
  standalone: true,
  imports: [RouterLink, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="success" aria-labelledby="success-title">
      @if (loading) {
        <p class="muted">{{ t('checkout.loading') }}</p>
      } @else if (error) {
        <p class="error" role="alert">{{ error }}</p>
        <a class="secondary" routerLink="/customer/orders">{{ t('checkout.success.viewOrders') }}</a>
      } @else if (order) {
        <div class="mark" aria-hidden="true">✓</div>
        <h1 id="success-title">{{ t('checkout.success.title') }}</h1>
        <p>{{ t('checkout.success.lede', { number: order.orderNumber }) }}</p>
        <dl>
          <div><dt>{{ t('checkout.success.orderNumber') }}</dt><dd>{{ order.orderNumber }}</dd></div>
          <div><dt>{{ t('checkout.total') }}</dt><dd>{{ money(order.total) }}</dd></div>
          <div><dt>{{ t('checkout.payment') }}</dt><dd>{{ t('checkout.cod') }}</dd></div>
          <div><dt>{{ t('checkout.success.shops') }}</dt><dd>{{ order.storeOrders.length }}</dd></div>
        </dl>
        @if (order.storeOrders.length > 1) { <p class="muted">{{ t('checkout.success.split', { count: order.storeOrders.length }) }}</p> }
        <div class="actions">
          <a class="primary" [routerLink]="['/customer/orders', order.id]">{{ t('checkout.success.viewOrder') }}</a>
          <a class="secondary" routerLink="/storefront/products">{{ t('checkout.success.continue') }}</a>
        </div>
      }
    </section>
    </ng-container>
  `,
  styles: [`
    .success { max-width: 560px; margin: 3rem auto 5rem; text-align: center; }
    .mark { width: 4rem; height: 4rem; margin: 0 auto 1rem; display: grid; place-items: center; border-radius: 50%; background: var(--green); color: var(--paper); font-size: 2rem; }
    h1 { margin: 0 0 .75rem; font: 700 clamp(2rem, 5vw, 3rem)/1 var(--display-font); }
    dl { margin: 1.5rem 0; display: grid; gap: .5rem; text-align: left; border: 1px solid var(--line); padding: 1rem; }
    dl div { display: flex; justify-content: space-between; gap: 1rem; }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; }
    .muted { color: var(--muted); font-size: .85rem; }
    .error { color: #8d3128; }
    .actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
    .primary, .secondary { padding: .75rem 1.2rem; border: 1px solid var(--ink); font-weight: 700; text-decoration: none; }
    .primary { background: var(--ink); color: var(--paper); }
    .secondary { color: var(--ink); }
  `]
})
export class OrderSuccessPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  order: Order | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orders.get(id).subscribe({
      next: order => { this.order = order; this.loading = false; },
      error: err => { this.loading = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }
}
