import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { ReportApiService } from '../../core/reports/report-api.service';
import { Operations, PlatformDashboard, Reconciliation } from '../../core/reports/report.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { DateRangeComponent, DayRange, utcDay } from '../../shared/components/date-range/date-range.component';
import { SalesBarsComponent } from '../../shared/components/sales-bars/sales-bars.component';

type Tab = 'overview' | 'operations' | 'reconciliation';

/** Platform reports: sales and commission, what needs attention now, and proof that the money adds up. */
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, TranslocoDirective, DateRangeComponent, SalesBarsComponent],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="areports-title">
      <div class="eyebrow">{{ t('reports.admin.eyebrow') }}</div>
      <h1 id="areports-title">{{ t('reports.admin.title') }}</h1>
      <p>{{ t('reports.admin.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <div class="actions" role="tablist">
          @for (item of tabs; track item) {
            <button type="button" role="tab" class="btn btn-small" [class.btn-secondary]="tab !== item" [attr.aria-selected]="tab === item" (click)="open(item)">{{ t('reports.admin.tabs.' + item) }}</button>
          }
        </div>
      </div>
      @if (tab !== 'operations') {
        <div class="panel-body"><app-date-range [from]="from" [to]="to" (rangeChange)="change($event)" /></div>
      }
      @if (error) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ error }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      }
    </div>

    @switch (tab) {
      @case ('overview') {
        @if (dashboard) {
          <div class="panel">
            <div class="panel-header"><h2>{{ t('reports.overview') }}</h2></div>
            <div class="panel-body"><div class="table-scroll"><table class="data-table"><tbody>
              <tr><th scope="row">{{ t('reports.orders') }}</th><td>{{ dashboard.summary.orders }}</td></tr>
              <tr><th scope="row">{{ t('reports.merchandise') }}</th><td><strong>{{ money(dashboard.summary.merchandise) }}</strong></td></tr>
              <tr><th scope="row">{{ t('reports.averageOrder') }}</th><td>{{ money(dashboard.averageOrderValue) }}</td></tr>
              <tr><th scope="row">{{ t('reports.commission') }}</th><td>{{ money(dashboard.summary.commission) }}</td></tr>
              <tr><th scope="row">{{ t('reports.refunded') }}</th><td>{{ money(dashboard.summary.refundedAmount) }}</td></tr>
              <tr><th scope="row">{{ t('reports.cancelled') }}</th><td>{{ dashboard.summary.cancelledOrders }}</td></tr>
              <tr><th scope="row">{{ t('reports.activeShops') }}</th><td>{{ dashboard.summary.activeShops }}</td></tr>
              <tr><th scope="row">{{ t('reports.newCustomers') }}</th><td>{{ dashboard.summary.newCustomers }}</td></tr>
            </tbody></table></div></div>
          </div>
          <div class="panel">
            <div class="panel-header"><h2>{{ t('reports.salesByDay') }}</h2></div>
            <div class="panel-body"><app-sales-bars [days]="dashboard.daily" [format]="formatMoney" /></div>
          </div>
          <div class="panel">
            <div class="panel-header"><h2>{{ t('reports.topShops') }}</h2></div>
            @if (dashboard.topShops.length === 0) {
              <p class="state">{{ t('reports.noSales') }}</p>
            } @else {
              <div class="table-scroll"><table class="data-table">
                <thead><tr><th>{{ t('reports.shop') }}</th><th>{{ t('reports.orders') }}</th><th>{{ t('reports.sales') }}</th></tr></thead>
                <tbody>@for (s of dashboard.topShops; track s.vendorId) { <tr><td>{{ s.shopName }} (#{{ s.vendorId }})</td><td>{{ s.orders }}</td><td>{{ money(s.sales) }}</td></tr> }</tbody>
              </table></div>
            }
          </div>
        } @else if (!error) {
          <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
        }
      }

      @case ('operations') {
        @if (operations) {
          <div class="panel">
            <div class="panel-header"><h2>{{ t('reports.admin.attention') }}</h2></div>
            <div class="table-scroll"><table class="data-table"><tbody>
              <tr><th scope="row">{{ t('reports.ops.pendingPayouts') }}</th><td>{{ operations.pendingPayouts }} · {{ money(operations.pendingPayoutAmount) }}</td><td><a routerLink="/admin/finance">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.openReturns') }}</th><td>{{ operations.openReturns }}</td><td><a routerLink="/admin/returns">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.unconfirmed') }}</th><td [class.field-error]="operations.unconfirmedShopOrders > 0">{{ operations.unconfirmedShopOrders }}</td><td><a routerLink="/admin/orders">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.failedJobs') }}</th><td [class.field-error]="operations.failedJobs > 0">{{ operations.failedJobs }}</td><td><a routerLink="/admin/jobs">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.failedEmails') }}</th><td [class.field-error]="operations.failedEmails > 0">{{ operations.failedEmails }}</td><td><a routerLink="/admin/emails">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.unrecordedSales') }}</th><td [class.field-error]="operations.unrecordedSales > 0">{{ operations.unrecordedSales }}</td><td><a routerLink="/admin/jobs">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.unrecordedRefunds') }}</th><td [class.field-error]="operations.unrecordedRefunds > 0">{{ operations.unrecordedRefunds }}</td><td><a routerLink="/admin/jobs">{{ t('reports.ops.open') }}</a></td></tr>
              <tr><th scope="row">{{ t('reports.ops.lowStock') }}</th><td>{{ operations.lowStockProducts }}</td><td></td></tr>
            </tbody></table></div>
            <div class="panel-body"><p class="muted">{{ t('reports.ops.hint') }}</p></div>
          </div>
        } @else if (!error) {
          <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
        }
      }

      @case ('reconciliation') {
        @if (reconciliation) {
          <div class="panel">
            <div class="panel-header"><h2>{{ t('reports.rec.title') }}</h2></div>
            <div class="panel-body">
              <p class="banner" [class.banner-ok]="reconciliation.difference === 0 && reconciliation.payoutMismatches === 0" role="status">
                @if (reconciliation.difference === 0 && reconciliation.payoutMismatches === 0) { {{ t('reports.rec.balanced') }} }
                @else { {{ t('reports.rec.unbalanced', { difference: money(reconciliation.difference), payouts: reconciliation.payoutMismatches }) }} }
              </p>
              <p class="muted">{{ t('reports.rec.explain') }}</p>
              <div class="table-scroll"><table class="data-table"><tbody>
                <tr><th scope="row">{{ t('reports.rec.saleLines') }}</th><td>{{ reconciliation.saleLines }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.items') }}</th><td>{{ money(reconciliation.items) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.shopDiscount') }}</th><td>{{ money(reconciliation.shopFundedDiscount) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.platformDiscount') }}</th><td>{{ money(reconciliation.platformFundedDiscount) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.shipping') }}</th><td>{{ money(reconciliation.shipping) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.tax') }}</th><td>{{ money(reconciliation.tax) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.customerPaid') }}</th><td><strong>{{ money(reconciliation.customerPaid) }}</strong></td></tr>
                <tr><th scope="row">{{ t('reports.rec.shopRevenue') }}</th><td>{{ money(reconciliation.shopRevenue) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.commission') }}</th><td>{{ money(reconciliation.commission) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.difference') }}</th><td [class.field-error]="reconciliation.difference !== 0"><strong>{{ money(reconciliation.difference) }}</strong></td></tr>
                <tr><th scope="row">{{ t('reports.rec.refundLines') }}</th><td>{{ reconciliation.refundLines }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.refundedFromShops') }}</th><td>{{ money(reconciliation.refundedFromShops) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.commissionReturned') }}</th><td>{{ money(reconciliation.commissionReturned) }}</td></tr>
                <tr><th scope="row">{{ t('reports.rec.payoutMismatches') }}</th><td [class.field-error]="reconciliation.payoutMismatches > 0">{{ reconciliation.payoutMismatches }}</td></tr>
              </tbody></table></div>
              <p class="muted">{{ reconciliation.fromUtc | date: 'mediumDate' }} – {{ reconciliation.toUtc | date: 'mediumDate' }}</p>
            </div>
          </div>
        } @else if (!error) {
          <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
        }
      }
    }
    </ng-container>
  `
})
export class AdminReportsPage implements OnInit {
  private readonly api = inject(ReportApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly tabs: Tab[] = ['overview', 'operations', 'reconciliation'];
  readonly formatMoney = (value: number) => this.money(value);

  tab: Tab = 'overview';
  from = utcDay(-29);
  to = utcDay();
  error = '';

  dashboard: PlatformDashboard | null = null;
  operations: Operations | null = null;
  reconciliation: Reconciliation | null = null;

  ngOnInit() {
    this.currency.load();
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  open(tab: Tab) {
    this.tab = tab;
    this.load();
  }

  change(range: DayRange) {
    this.from = range.from;
    this.to = range.to;
    this.load();
  }

  load() {
    this.error = '';
    const fail = (err: Parameters<typeof vendorErrorMessage>[0]) => this.error = vendorErrorMessage(err, this.transloco.translate('reports.errors.load'));
    if (this.tab === 'overview') {
      this.dashboard = null;
      this.api.platformDashboard(this.from, this.to).subscribe({ next: d => this.dashboard = d, error: fail });
    } else if (this.tab === 'operations') {
      this.operations = null;
      this.api.operations().subscribe({ next: o => this.operations = o, error: fail });
    } else {
      this.reconciliation = null;
      this.api.reconciliation(this.from, this.to).subscribe({ next: r => this.reconciliation = r, error: fail });
    }
  }
}
