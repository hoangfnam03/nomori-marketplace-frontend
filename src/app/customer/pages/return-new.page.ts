import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { OrderLine, ShopOrderDetail } from '../../core/orders/order.models';
import { ReturnApiService } from '../../core/returns/return-api.service';
import { RETURN_REASONS, ReturnReason } from '../../core/returns/return.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** Ask to return items of one delivered shop order: choose how many of each line, say why, send. The server works out the refund. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="return-new-title">
      <div class="eyebrow">{{ t('returns.customer.eyebrow') }}</div>
      <h1 id="return-new-title">{{ t('returns.customer.newTitle') }}</h1>
      <p><a [routerLink]="['/customer/orders', orderId]">← {{ t('returns.customer.backToOrder') }}</a></p>
    </section>

    @if (loading) {
      <p class="state">{{ t('common.states.loading') }}</p>
    } @else if (notFound) {
      <p class="state" role="alert">{{ t('common.states.notFound') }}</p>
    } @else if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
      </div></div>
    } @else if (shop) {
      <div class="panel">
        <div class="panel-header"><h2>{{ shop.number }} <span class="muted">· {{ shop.shopName }}</span></h2></div>
        <div class="panel-body">
          <form (ngSubmit)="submit()" #form="ngForm">
            <table class="data-table">
              <thead><tr><th>{{ t('returns.item') }}</th><th>{{ t('returns.bought') }}</th><th>{{ t('returns.returnQuantity') }}</th></tr></thead>
              <tbody>
                @for (line of shop.lines; track line.id) {
                  <tr>
                    <td>{{ line.name }}@if (line.variantLabel) { <span class="muted"> ({{ line.variantLabel }})</span> }</td>
                    <td>{{ line.quantity }} × {{ money(line.unitPrice) }}</td>
                    <td>
                      <input type="number" min="0" [max]="line.quantity" step="1" [(ngModel)]="quantities[line.id]" [name]="'qty-' + line.id"
                        style="width:5rem" [attr.aria-label]="t('returns.returnQuantityOf', { name: line.name })" />
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <p>
              <label for="return-reason">{{ t('returns.reason') }}</label><br />
              <select id="return-reason" [(ngModel)]="reason" name="reason" required>
                <option value="" disabled>{{ t('returns.chooseReason') }}</option>
                @for (r of reasons; track r) { <option [value]="r">{{ t('returns.reasons.' + r) }}</option> }
              </select>
            </p>
            <p>
              <label for="return-note">{{ t('returns.yourNote') }}</label><br />
              <textarea id="return-note" [(ngModel)]="note" name="note" rows="3" maxlength="500" style="width:100%"></textarea>
            </p>

            @if (error) { <p class="banner" role="alert">{{ error }}</p> }
            <div class="actions">
              <button type="submit" class="btn" [disabled]="busy || !form.valid">{{ t('returns.customer.submit') }}</button>
              <a class="btn btn-secondary" [routerLink]="['/customer/orders', orderId]">{{ t('common.actions.cancel') }}</a>
            </div>
          </form>
        </div>
      </div>
    }
    </ng-container>
  `
})
export class ReturnNewPage implements OnInit {
  private readonly orders = inject(OrderApiService);
  private readonly returns = inject(ReturnApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly reasons = RETURN_REASONS;

  orderId = 0;
  shop: ShopOrderDetail | null = null;
  quantities: Record<number, number> = {};
  reason: ReturnReason | '' = '';
  note = '';
  loading = true;
  notFound = false;
  loadError = '';
  busy = false;
  error = '';

  ngOnInit() {
    this.orderId = Number(this.route.snapshot.paramMap.get('orderId'));
    this.currency.load();
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  load() {
    const shopOrderId = Number(this.route.snapshot.paramMap.get('shopOrderId'));
    this.loading = true;
    this.notFound = false;
    this.loadError = '';
    this.orders.myOrder(this.orderId).subscribe({
      next: order => {
        this.shop = order.shopOrders.find(s => s.id === shopOrderId) ?? null;
        this.notFound = !this.shop;
        this.quantities = Object.fromEntries((this.shop?.lines ?? []).map((l: OrderLine) => [l.id, 0]));
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        if (err?.status === 404) this.notFound = true;
        else this.loadError = vendorErrorMessage(err, this.transloco.translate('orders.errors.loadOne'));
      }
    });
  }

  submit() {
    if (!this.shop || !this.reason) return;
    const lines = this.shop.lines
      .map(l => ({ orderLineId: l.id, quantity: Math.floor(Number(this.quantities[l.id]) || 0) }))
      .filter(l => l.quantity > 0);
    if (lines.length === 0) { this.error = this.transloco.translate('returns.errors.noItems'); return; }

    this.busy = true;
    this.error = '';
    this.returns.request({ shopOrderId: this.shop.id, reason: this.reason, note: this.note.trim(), lines }).subscribe({
      next: () => { this.busy = false; void this.router.navigate(['/customer/returns']); },
      error: err => { this.busy = false; this.error = vendorErrorMessage(err, this.transloco.translate('returns.errors.request')); }
    });
  }
}
