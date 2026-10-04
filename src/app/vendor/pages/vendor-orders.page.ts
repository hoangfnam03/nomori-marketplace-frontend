import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CurrencyService } from '../../core/money/currency.service';
import { OrderApiService } from '../../core/orders/order-api.service';
import { StoreOrder, VENDOR_ORDER_TABS, VendorOrderTab } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

/** The shop's orders (vendor-orders-prd.md, US-B1, B3): status tabs with counts, search, date range, confirm several at once. */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="orders-title">
      <div class="eyebrow">{{ t('vendor.portal.eyebrow') }}</div>
      <h1 id="orders-title">{{ t('vendor.orders.title') }}</h1>
      <p>{{ t('vendor.orders.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <nav class="tabs" [attr.aria-label]="t('orders.tabsLabel')">
        @for (tab of tabs; track tab) {
          <button type="button" [class.active]="tab === activeTab" [attr.aria-current]="tab === activeTab ? 'page' : null" (click)="setTab(tab)">
            {{ tab === 'all' ? t('orders.tab.all') : t('vendor.orders.status.' + tab) }}
            @if (counts[tab]) { <span class="count">{{ counts[tab] }}</span> }
          </button>
        }
      </nav>

      <form class="filters" (ngSubmit)="applyFilters()" role="search">
        <label>{{ t('orders.searchLabel') }}
          <input type="search" name="q" [(ngModel)]="query" maxlength="100" [placeholder]="t('vendor.orders.searchPlaceholder')" />
        </label>
        <label>{{ t('vendor.orders.from') }}<input type="date" name="from" [(ngModel)]="from" /></label>
        <label>{{ t('vendor.orders.to') }}<input type="date" name="to" [(ngModel)]="to" /></label>
        <button type="submit" class="btn btn-secondary">{{ t('orders.searchButton') }}</button>
      </form>

      <div class="panel">
        @if (selected.size > 0) {
          <div class="panel-header bulk">
            <span>{{ t('vendor.orders.selected', { count: selected.size }) }}</span>
            <button type="button" class="btn" (click)="confirmSelected()" [disabled]="busy">{{ t('vendor.orders.confirmSelected') }}</button>
          </div>
        }
        @if (notice) { <p class="banner banner-ok" role="status">{{ notice }}</p> }
        @if (error) { <p class="banner" role="alert">{{ error }}</p> }

        @if (loading) {
          <p class="state">{{ t('orders.loading') }}</p>
        } @else if (items.length === 0) {
          <p class="state">{{ t('vendor.orders.empty') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th><span class="sr-only">{{ t('vendor.orders.select') }}</span></th>
                  <th>{{ t('vendor.orders.number') }}</th>
                  <th>{{ t('vendor.orders.placed') }}</th>
                  <th>{{ t('vendor.orders.recipient') }}</th>
                  <th>{{ t('vendor.orders.items') }}</th>
                  <th>{{ t('orders.total') }}</th>
                  <th>{{ t('admin.common.status') }}</th>
                  <th>{{ t('vendor.orders.deadline') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (s of items; track s.id) {
                  <tr>
                    <td>
                      @if (s.canConfirm) {
                        <input type="checkbox" [checked]="selected.has(s.id)" (change)="toggle(s)" [attr.aria-label]="t('vendor.orders.selectOrder', { number: s.subOrderNumber })" />
                      }
                    </td>
                    <td><a [routerLink]="['/vendor/orders', s.id]">{{ s.subOrderNumber }}</a></td>
                    <td>{{ s.createdOnUtc | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ s.recipientName }}<br /><span class="muted">{{ s.recipientPhone }}</span></td>
                    <td>{{ s.itemCount }}</td>
                    <td>{{ money(s.total) }}<br /><span class="muted">{{ t('vendor.orders.cod') }}</span></td>
                    <td><span class="badge" [class.badge-pending]="s.status === 'pending'" [class.badge-cancelled]="s.status === 'cancelled'"
                      [class.badge-approved]="s.status === 'delivered' || s.status === 'completed'">{{ t('vendor.orders.status.' + s.status) }}</span></td>
                    <td>
                      @if (s.status === 'pending') {
                        <span [class.urgent]="isUrgent(s)">{{ s.confirmByUtc | date: 'dd/MM HH:mm' }}</span>
                      } @else { — }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (totalPages > 1) {
            <div class="pagination">
              <button type="button" class="btn btn-secondary btn-small" (click)="goPage(page - 1)" [disabled]="page <= 1">←</button>
              <span>{{ page }} / {{ totalPages }}</span>
              <button type="button" class="btn btn-secondary btn-small" (click)="goPage(page + 1)" [disabled]="page >= totalPages">→</button>
            </div>
          }
        }
      </div>
    }
    </ng-container>
  `,
  styles: [`
    .tabs { display: flex; gap: .25rem; overflow-x: auto; border-bottom: 1px solid var(--line); margin-bottom: 1rem; }
    .tabs button { border: 0; border-bottom: 2px solid transparent; padding: .65rem .85rem; background: transparent; color: var(--muted); font: 600 .88rem inherit; cursor: pointer; white-space: nowrap; }
    .tabs button.active { border-bottom-color: var(--green); color: var(--ink); }
    .count { margin-left: .3rem; padding: 0 .4rem; border-radius: 999px; background: color-mix(in srgb, var(--green) 14%, transparent); color: var(--green); font-size: .75rem; }
    .filters { display: flex; gap: .75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 1rem; }
    .filters label { display: grid; gap: .25rem; color: var(--muted); font-size: .75rem; }
    .filters input { border: 1px solid var(--line-strong); padding: .5rem; background: var(--paper); color: var(--ink); font: inherit; }
    .filters input[type="search"] { min-width: 260px; }
    .bulk { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .muted { color: var(--muted); font-size: .78rem; }
    .urgent { color: #8d3128; font-weight: 700; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  `]
})
export class VendorOrdersPage implements OnInit {
  private readonly orders = inject(OrderApiService);
  private readonly auth = inject(AuthFacade);
  private readonly currency = inject(CurrencyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly tabs = VENDOR_ORDER_TABS;
  vendorId: number | null = null;
  activeTab: VendorOrderTab = 'pending';
  query = '';
  from = '';
  to = '';
  items: StoreOrder[] = [];
  counts: Partial<Record<VendorOrderTab, number>> = {};
  selected = new Set<number>();
  page = 1;
  totalPages = 1;
  loading = true;
  busy = false;
  error = '';
  notice = '';

  ngOnInit() {
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        // The tab, search and dates live in the address bar so a link or refresh keeps them.
        this.route.queryParamMap.subscribe(params => {
          const tab = params.get('status') as VendorOrderTab | null;
          this.activeTab = tab && VENDOR_ORDER_TABS.includes(tab) ? tab : 'pending';
          this.query = params.get('q') ?? '';
          this.from = params.get('from') ?? '';
          this.to = params.get('to') ?? '';
          this.page = Number(params.get('page')) || 1;
          this.fetch();
        });
      },
      error: () => { this.loading = false; this.error = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  /** Less than six hours left to confirm (or already late): the shop should act now. */
  isUrgent(s: StoreOrder) { return new Date(s.confirmByUtc).getTime() < Date.now() + 6 * 3600 * 1000; }

  setTab(tab: VendorOrderTab) { this.navigate({ status: tab, page: null }); }

  applyFilters() { this.navigate({ q: this.query.trim() || null, from: this.from || null, to: this.to || null, page: null }); }

  goPage(page: number) { this.navigate({ page: page > 1 ? page : null }); }

  toggle(s: StoreOrder) {
    const next = new Set(this.selected);
    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
    this.selected = next;
  }

  confirmSelected() {
    if (!this.vendorId || this.selected.size === 0) return;
    this.busy = true;
    this.error = '';
    this.notice = '';
    this.orders.confirmMany(this.vendorId, [...this.selected]).subscribe({
      next: result => {
        this.busy = false;
        this.notice = this.transloco.translate('vendor.orders.confirmedCount', { count: result.confirmed.length })
          + (result.skipped.length ? ' ' + this.transloco.translate('vendor.orders.skippedCount', { count: result.skipped.length }) : '');
        this.fetch();
      },
      error: err => { this.busy = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.action')); }
    });
  }

  private navigate(params: Record<string, string | number | null>) {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
  }

  private fetch() {
    if (!this.vendorId) return;
    this.loading = true;
    this.error = '';
    this.selected = new Set();
    this.orders.vendorList(this.vendorId, this.activeTab, this.page, PAGE_SIZE, this.query.trim() || undefined, this.from || undefined, this.to || undefined)
      .subscribe({
        next: page => {
          this.loading = false;
          this.items = page.items;
          this.counts = page.tabCounts;
          this.totalPages = Math.max(page.totalPages, 1);
        },
        error: err => { this.loading = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
      });
  }
}
