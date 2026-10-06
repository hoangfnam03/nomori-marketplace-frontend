import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { ReturnApiService } from '../../core/returns/return-api.service';
import { ReturnRequest } from '../../core/returns/return.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 10;

/** The signed-in customer's return requests, newest first. A request that still waits can be withdrawn. */
@Component({
  standalone: true,
  imports: [DatePipe, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="returns-title">
      <div class="eyebrow">{{ t('returns.customer.eyebrow') }}</div>
      <h1 id="returns-title">{{ t('returns.customer.title') }}</h1>
      <p>{{ t('returns.customer.lede') }} <a routerLink="/customer/orders">{{ t('returns.customer.toOrders') }}</a></p>
    </section>

    @if (notice) { <p class="banner" role="status">{{ notice }}</p> }
    @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

    @if (loading && items.length === 0) {
      <p class="state">{{ t('common.states.loading') }}</p>
    } @else if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="goTo(page)">{{ t('common.actions.retry') }}</button></div>
      </div></div>
    } @else if (items.length === 0) {
      <div class="panel"><p class="state">{{ t('returns.customer.empty') }}</p></div>
    } @else {
      @for (r of items; track r.id) {
        <div class="panel">
          <div class="panel-header">
            <h2>{{ r.number }} <span class="muted">· {{ t('returns.forOrder', { number: r.shopOrderNumber }) }} · {{ r.shopName }}</span></h2>
            <span class="badge" [class.badge-active]="r.status === 'refunded' || r.status === 'approved' || r.status === 'received'"
              [class.badge-pending]="r.status === 'requested'" [class.badge-rejected]="r.status === 'rejected'">{{ t('returns.status.' + r.status) }}</span>
          </div>
          <div class="panel-body">
            <p class="muted">{{ r.createdOnUtc | date: 'medium' }} · {{ t('returns.reasons.' + r.reason) }}</p>
            <ul>
              @for (l of r.lines; track l.id) {
                <li>{{ l.quantity }} × {{ l.name }}@if (l.variantLabel) { ({{ l.variantLabel }}) } — {{ money(l.amount) }}</li>
              }
            </ul>
            <p><strong>{{ t('returns.refundAmount') }}: {{ money(r.refundAmount) }}</strong>
              @if (r.status === 'refunded') { <span class="muted"> · {{ t('returns.refundedOn', { date: (r.updatedOnUtc | date: 'medium') }) }}</span> }</p>
            @if (r.customerNote) { <p class="muted">{{ t('returns.yourNote') }}: {{ r.customerNote }}</p> }
            @if (r.resolutionNote) { <p>{{ t('returns.shopNote') }}: {{ r.resolutionNote }}</p> }
            @if (r.status === 'approved') { <p class="muted">{{ t('returns.customer.sendBack') }}</p> }
            @if (r.status === 'requested') {
              <div class="actions"><button type="button" class="btn btn-secondary btn-small" (click)="withdraw(r)" [disabled]="busy">{{ t('returns.customer.withdraw') }}</button></div>
            }
          </div>
        </div>
      }
      <nav class="pagination" [attr.aria-label]="t('common.pagination.label')">
        <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page - 1)" [disabled]="page <= 1 || loading">{{ t('common.pagination.prev') }}</button>
        <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
        <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page + 1)" [disabled]="page >= totalPages || loading">{{ t('common.pagination.next') }}</button>
      </nav>
    }
    </ng-container>
  `
})
export class ReturnsPage implements OnInit {
  private readonly api = inject(ReturnApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  items: ReturnRequest[] = [];
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';
  busy = false;
  notice = '';
  actionError = '';

  ngOnInit() {
    this.currency.load();
    this.goTo(1);
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.api.myReturns(this.page, PAGE_SIZE).subscribe({
      next: result => {
        this.items = result.items;
        this.totalPages = Math.max(result.totalPages, 1);
        this.loading = false;
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('returns.errors.load')); }
    });
  }

  withdraw(request: ReturnRequest) {
    this.busy = true;
    this.notice = '';
    this.actionError = '';
    this.api.withdraw(request.id).subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('returns.customer.withdrawn'); this.goTo(this.page); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('returns.errors.withdraw'));
        // The shop may have decided meanwhile: show it as it is now.
        if (err?.status === 409 || err?.status === 404) this.goTo(this.page);
      }
    });
  }
}
