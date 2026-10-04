import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { OrderApiService } from '../../core/orders/order-api.service';
import { Order, ORDER_TABS, OrderTab, StoreOrder } from '../../core/orders/order.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { StoreOrderCardComponent } from '../components/store-order-card.component';

const PAGE_SIZE = 10;

/** "My orders": one card per shop order, by status tab, newest first. The tab and search live in the address bar. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, StoreOrderCardComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page-heading">
      <div class="eyebrow">{{ t('orders.eyebrow') }}</div>
      <h1>{{ t('orders.title') }}</h1>
    </div>

    <nav class="tabs" [attr.aria-label]="t('orders.tabsLabel')">
      @for (tab of tabs; track tab) {
        <button type="button" [class.active]="tab === activeTab" [attr.aria-current]="tab === activeTab ? 'page' : null" (click)="selectTab(tab)">
          {{ t('orders.tab.' + tab) }}
          @if (counts[tab]) { <span class="count">{{ counts[tab] }}</span> }
        </button>
      }
    </nav>

    <form class="search" role="search" (ngSubmit)="search()">
      <label class="sr-only" for="order-search">{{ t('orders.searchLabel') }}</label>
      <input id="order-search" type="search" name="q" [(ngModel)]="query" maxlength="100" [placeholder]="t('orders.searchPlaceholder')" />
      <button type="submit">{{ t('orders.searchButton') }}</button>
    </form>

    @if (error) {
      <p class="banner" role="alert">{{ error }}</p>
      <button type="button" class="secondary" (click)="reload()">{{ t('common.actions.retry') }}</button>
    } @else if (loading && items.length === 0) {
      <p class="state">{{ t('orders.loading') }}</p>
    } @else if (items.length === 0) {
      <div class="empty">
        <p>{{ appliedQuery ? t('orders.noResults') : t('orders.empty') }}</p>
        @if (!appliedQuery) { <a class="primary" routerLink="/storefront/products">{{ t('orders.shopNow') }}</a> }
      </div>
    } @else {
      <div class="list">
        @for (s of items; track s.id) {
          <app-store-order-card [storeOrder]="s" [showOrderLink]="true" (changed)="onChanged($event)" />
        }
      </div>
      @if (items.length < total) {
        <div class="more">
          <button type="button" class="secondary" (click)="loadMore()" [disabled]="loading">{{ loading ? t('orders.loading') : t('orders.loadMore') }}</button>
        </div>
      }
    }
    </ng-container>
  `,
  styles: [`
    :host { display: block; max-width: 900px; margin: 0 auto; padding-bottom: 4rem; }
    .page-heading { padding: 1rem 0 1.5rem; }
    .eyebrow { margin-top: 2rem; color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 1rem 0 0; font: 700 clamp(2.5rem, 6vw, 4rem)/.95 var(--display-font); }
    .tabs { display: flex; gap: .25rem; overflow-x: auto; border-bottom: 1px solid var(--line); margin-bottom: 1rem; }
    .tabs button { border: 0; border-bottom: 2px solid transparent; padding: .7rem .9rem; background: transparent; color: var(--muted); font: 600 .9rem inherit; cursor: pointer; white-space: nowrap; }
    .tabs button.active { border-bottom-color: var(--green); color: var(--ink); }
    .count { margin-left: .3rem; padding: 0 .4rem; border-radius: 999px; background: color-mix(in srgb, var(--green) 14%, transparent); color: var(--green); font-size: .75rem; }
    .search { display: flex; gap: .5rem; margin-bottom: 1.25rem; }
    .search input { flex: 1; border: 1px solid var(--line-strong); padding: .6rem .8rem; background: var(--paper); color: var(--ink); font: inherit; }
    .search button, .secondary, .primary { border: 1px solid var(--ink); padding: .6rem 1rem; font: 700 .85rem inherit; cursor: pointer; text-decoration: none; }
    .search button, .secondary { background: transparent; color: var(--ink); }
    .primary { display: inline-block; background: var(--ink); color: var(--paper); }
    .list { display: grid; gap: 1rem; }
    .state { color: var(--muted); padding: 2rem 0; }
    .empty { padding: 3rem 0; text-align: center; color: var(--muted); display: grid; gap: 1rem; justify-items: center; }
    .banner { padding: .8rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; }
    .more { display: flex; justify-content: center; margin-top: 1.5rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  `]
})
export class OrdersPage implements OnInit {
  private readonly orders = inject(OrderApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly tabs = ORDER_TABS;
  activeTab: OrderTab = 'all';
  query = '';
  appliedQuery = '';
  items: StoreOrder[] = [];
  counts: Partial<Record<OrderTab, number>> = {};
  total = 0;
  page = 1;
  loading = false;
  error = '';

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('status') as OrderTab | null;
      this.activeTab = tab && ORDER_TABS.includes(tab) ? tab : 'all';
      this.appliedQuery = params.get('q') ?? '';
      this.query = this.appliedQuery;
      this.reload();
    });
  }

  selectTab(tab: OrderTab) { this.navigate(tab, this.appliedQuery); }

  search() { this.navigate(this.activeTab, this.query.trim()); }

  reload() {
    this.page = 1;
    this.items = [];
    this.fetch();
  }

  loadMore() {
    this.page++;
    this.fetch();
  }

  /** A card changed its shop order: show the new state, and refresh the tab counts. */
  onChanged(order: Order) {
    const fresh = new Map(order.storeOrders.map(s => [s.id, s]));
    this.items = this.items.map(s => fresh.get(s.id) ? { ...fresh.get(s.id)!, orderNumber: s.orderNumber } : s);
    this.orders.list(this.activeTab, 1, 1, this.appliedQuery || undefined).subscribe({ next: page => this.counts = page.tabCounts, error: () => undefined });
  }

  private navigate(tab: OrderTab, q: string) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { status: tab === 'all' ? null : tab, q: q || null } });
  }

  private fetch() {
    this.loading = true;
    this.error = '';
    this.orders.list(this.activeTab, this.page, PAGE_SIZE, this.appliedQuery || undefined).subscribe({
      next: page => {
        this.loading = false;
        this.items = this.page === 1 ? page.items : [...this.items, ...page.items];
        this.total = page.totalCount;
        this.counts = page.tabCounts;
      },
      error: err => { this.loading = false; this.error = vendorErrorMessage(err, this.transloco.translate('orders.errors.load')); }
    });
  }
}
