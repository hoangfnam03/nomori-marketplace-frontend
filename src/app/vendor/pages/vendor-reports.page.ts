import { Component, inject, OnInit } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CurrencyService } from '../../core/money/currency.service';
import { ReportApiService } from '../../core/reports/report-api.service';
import { ORDER_STATUS_ORDER, ShopDashboard } from '../../core/reports/report.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { DateRangeComponent, DayRange, utcDay } from '../../shared/components/date-range/date-range.component';
import { SalesBarsComponent } from '../../shared/components/sales-bars/sales-bars.component';

/** How the shop is doing: sales, returns, best sellers and what is running out. Only members of the shop get here. */
@Component({
  standalone: true,
  imports: [TranslocoDirective, DateRangeComponent, SalesBarsComponent],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="reports-title">
      <div class="eyebrow">{{ t('reports.vendor.eyebrow') }}</div>
      <h1 id="reports-title">{{ t('reports.vendor.title') }}</h1>
      <p>{{ t('reports.vendor.lede') }}</p>
    </section>

    @if (!vendorId && !loadingSession) {
      <div class="panel"><p class="state">{{ t('reports.vendor.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-body"><app-date-range [from]="from" [to]="to" (rangeChange)="change($event)" /></div>
      </div>

      @if (error) {
        <div class="panel"><div class="panel-body">
          <p class="banner" role="alert">{{ error }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div></div>
      } @else if (!dashboard) {
        <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
      } @else {
        <div class="panel">
          <div class="panel-header"><h2>{{ t('reports.overview') }}</h2></div>
          <div class="panel-body">
            <div class="table-scroll">
              <table class="data-table">
                <tbody>
                  <tr><th scope="row">{{ t('reports.orders') }}</th><td>{{ dashboard.summary.orders }}</td></tr>
                  <tr><th scope="row">{{ t('reports.units') }}</th><td>{{ dashboard.summary.units }}</td></tr>
                  <tr><th scope="row">{{ t('reports.sales') }}</th><td><strong>{{ money(dashboard.summary.sales) }}</strong></td></tr>
                  <tr><th scope="row">{{ t('reports.averageOrder') }}</th><td>{{ money(dashboard.averageOrderValue) }}</td></tr>
                  <tr><th scope="row">{{ t('reports.shipping') }}</th><td>{{ money(dashboard.summary.shipping) }}</td></tr>
                  <tr><th scope="row">{{ t('reports.cancelled') }}</th><td>{{ dashboard.summary.cancelledOrders }}</td></tr>
                  <tr><th scope="row">{{ t('reports.returnsOpened') }}</th><td>{{ dashboard.summary.returnsOpened }}</td></tr>
                  <tr><th scope="row">{{ t('reports.refunded') }}</th><td>{{ money(dashboard.summary.refundedAmount) }}</td></tr>
                </tbody>
              </table>
            </div>
            <p class="muted">{{ t('reports.salesHint') }}</p>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h2>{{ t('reports.salesByDay') }}</h2></div>
          <div class="panel-body"><app-sales-bars [days]="dashboard.daily" [format]="formatMoney" /></div>
        </div>

        <div class="panel">
          <div class="panel-header"><h2>{{ t('reports.ordersByStatus') }}</h2></div>
          <div class="panel-body">
            <div class="actions">
              @for (s of statuses; track s) {
                <span class="badge" [class.badge-active]="s === 'completed'" [class.badge-pending]="s === 'pending'" [class.badge-cancelled]="s === 'cancelled'">{{ t('orders.status.' + s) }}: {{ dashboard.ordersByStatus[s] ?? 0 }}</span>
              }
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h2>{{ t('reports.topProducts') }}</h2></div>
          @if (dashboard.topProducts.length === 0) {
            <p class="state">{{ t('reports.noProducts') }}</p>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>{{ t('reports.product') }}</th><th>{{ t('reports.units') }}</th><th>{{ t('reports.revenue') }}</th></tr></thead>
                <tbody>
                  @for (p of dashboard.topProducts; track p.productId) {
                    <tr><td>{{ p.name }}</td><td>{{ p.units }}</td><td>{{ money(p.revenue) }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <div class="panel">
          <div class="panel-header"><h2>{{ t('reports.lowStock') }}</h2></div>
          @if (dashboard.lowStock.length === 0) {
            <p class="state">{{ t('reports.noLowStock') }}</p>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>{{ t('reports.product') }}</th><th>{{ t('reports.sku') }}</th><th>{{ t('reports.inStock') }}</th><th>{{ t('reports.threshold') }}</th></tr></thead>
                <tbody>
                  @for (p of dashboard.lowStock; track p.productId) {
                    <tr><td>{{ p.name }}</td><td>{{ p.sku ?? '' }}</td><td [class.field-error]="p.stockQuantity === 0">{{ p.stockQuantity }}</td><td>{{ p.lowStockThreshold }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    }
    </ng-container>
  `
})
export class VendorReportsPage implements OnInit {
  private readonly api = inject(ReportApiService);
  private readonly auth = inject(AuthFacade);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly statuses = ORDER_STATUS_ORDER;
  readonly formatMoney = (value: number) => this.money(value);

  vendorId: number | null = null;
  loadingSession = true;
  from = utcDay(-29);
  to = utcDay();
  dashboard: ShopDashboard | null = null;
  error = '';

  ngOnInit() {
    this.currency.load();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        this.loadingSession = false;
        if (this.vendorId) this.load();
      },
      error: () => { this.loadingSession = false; this.error = this.transloco.translate('reports.errors.load'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  change(range: DayRange) {
    this.from = range.from;
    this.to = range.to;
    this.load();
  }

  load() {
    if (!this.vendorId) return;
    this.error = '';
    this.dashboard = null;
    this.api.shopDashboard(this.vendorId, this.from, this.to).subscribe({
      next: dashboard => this.dashboard = dashboard,
      error: err => this.error = vendorErrorMessage(err, this.transloco.translate('reports.errors.load'))
    });
  }
}
