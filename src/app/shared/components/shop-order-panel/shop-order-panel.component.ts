import { Component, inject, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { MediaApiService } from '../../../core/media/media-api.service';
import { CurrencyService } from '../../../core/money/currency.service';
import { OrderLine, ShopOrderDetail } from '../../../core/orders/order.models';
import { OrderStatusBadgeComponent } from '../order-status-badge/order-status-badge.component';

/**
 * One shop order: lines with their price snapshot, totals, tracking, who changed it when. Actions are projected in by the page,
 * because who may do what differs between the customer, the shop and the administrator.
 */
@Component({
  selector: 'app-shop-order-panel',
  standalone: true,
  imports: [DatePipe, OrderStatusBadgeComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="shop-order" [attr.aria-label]="order.number">
      <header>
        <div>
          <h3>{{ order.shopName }}</h3>
          <span class="muted">{{ order.number }} · {{ order.createdOnUtc | date: 'medium' }}</span>
        </div>
        <app-order-status-badge [status]="order.status" />
      </header>

      <ul class="lines">
        @for (line of order.lines; track line.id) {
          <li>
            <span class="thumb" aria-hidden="true">@if (pictureUrl(line); as url) { <img [src]="url" alt="" loading="lazy" /> }</span>
            <span class="info">
              <strong>{{ line.name }}</strong>
              @if (line.variantLabel) { <span class="muted">{{ line.variantLabel }}</span> }
              @if (line.sku) { <span class="muted sku">{{ line.sku }}</span> }
            </span>
            <span class="qty">{{ line.quantity }} × {{ money(line.unitPrice) }}</span>
            <strong>{{ money(line.lineTotal) }}</strong>
          </li>
        }
      </ul>

      <dl class="totals">
        <div><dt>{{ t('orders.subtotal') }}</dt><dd>{{ money(order.subtotal) }}</dd></div>
        <div><dt>{{ t('orders.shipping') }} ({{ order.shippingMethodName }})</dt><dd>{{ money(order.shippingFee) }}</dd></div>
        <div class="grand"><dt>{{ t('orders.total') }}</dt><dd>{{ money(order.total) }}</dd></div>
      </dl>

      @if (order.carrier) {
        <p class="tracking"><strong>{{ t('orders.tracking') }}:</strong> {{ order.carrier }} · {{ order.trackingNumber }}</p>
      }
      @if (order.cancelReason) {
        <p class="cancel"><strong>{{ t('orders.cancelReason') }}:</strong> {{ order.cancelReason }}</p>
      }

      <details class="history">
        <summary>{{ t('orders.history') }}</summary>
        <ol>
          @for (entry of order.history; track $index) {
            <li>
              <span class="muted">{{ entry.createdOnUtc | date: 'medium' }}</span>
              {{ t('orders.status.' + entry.to) }} · {{ t('orders.actor.' + entry.actor) }}
              @if (entry.note) { <span class="muted"> — {{ entry.note }}</span> }
            </li>
          }
        </ol>
      </details>

      <div class="actions"><ng-content /></div>
    </section>
    </ng-container>
  `,
  styles: [`
    .shop-order { border: 1px solid var(--line); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; display: grid; gap: .75rem; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    h3 { margin: 0; font-size: 1rem; }
    .muted { color: var(--muted); font-size: .8rem; }
    .sku { font-family: var(--mono-font); }
    .lines { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .lines li { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto auto; gap: .75rem; align-items: center; font-size: .9rem; }
    .thumb { width: 48px; height: 48px; background: #e4e8df; overflow: hidden; display: block; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .info { display: grid; gap: .1rem; }
    .qty { color: var(--muted); font-size: .85rem; }
    .totals { margin: 0; display: grid; gap: .25rem; font-size: .9rem; }
    .totals div { display: flex; justify-content: space-between; }
    .totals dt { color: var(--muted); }
    .totals dd { margin: 0; }
    .grand { font-weight: 700; border-top: 1px solid var(--line); padding-top: .4rem; }
    .tracking, .cancel { margin: 0; font-size: .85rem; }
    .cancel { color: #8d3128; }
    .history summary { cursor: pointer; font-size: .85rem; color: var(--muted); }
    .history ol { margin: .5rem 0 0; padding-left: 1.2rem; font-size: .85rem; display: grid; gap: .25rem; }
    .actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: flex-start; }
    .actions:empty { display: none; }
    @media (max-width: 600px) { .lines li { grid-template-columns: 48px minmax(0, 1fr); } .qty, .lines strong { grid-column: 2; } }
  `]
})
export class ShopOrderPanelComponent {
  private readonly media = inject(MediaApiService);
  private readonly currency = inject(CurrencyService);

  @Input({ required: true }) order!: ShopOrderDetail;

  money(value: number) { return this.currency.formatPrimary(value); }

  pictureUrl(line: OrderLine) { return this.media.url(line.pictureId); }
}
