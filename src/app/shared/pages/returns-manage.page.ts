import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CurrencyService } from '../../core/money/currency.service';
import { ReturnApiService } from '../../core/returns/return-api.service';
import { RETURN_STATUSES, ReturnRequest, ReturnStatus } from '../../core/returns/return.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

type Mode = 'vendor' | 'admin';

/**
 * The returns a shop (route data mode "vendor") or the platform (mode "admin") has to deal with. Shops approve or reject and confirm that
 * the goods came back; only the platform sends the money back. The server enforces all of it: the buttons only follow what it allows.
 */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, TranslocoDirective],
  styleUrls: ['../styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="manage-returns-title">
      <div class="eyebrow">{{ t(mode === 'admin' ? 'returns.admin.eyebrow' : 'returns.vendor.eyebrow') }}</div>
      <h1 id="manage-returns-title">{{ t('returns.manage.title') }}</h1>
      <p>{{ t(mode === 'admin' ? 'returns.admin.lede' : 'returns.vendor.lede') }}</p>
    </section>

    @if (mode === 'vendor' && !vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('returns.manage.list') }}</h2>
          <div class="actions">
            <select [(ngModel)]="status" name="status" (ngModelChange)="goTo(1)" [attr.aria-label]="t('returns.manage.filterStatus')">
              <option value="">{{ t('returns.manage.allStatuses') }}</option>
              @for (s of statuses; track s) { <option [value]="s">{{ t('returns.status.' + s) }}</option> }
            </select>
          </div>
        </div>

        @if (notice) { <p class="banner" role="status">{{ notice }}</p> }
        @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

        @if (loading && items.length === 0) {
          <p class="state">{{ t('common.states.loading') }}</p>
        } @else if (loadError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="goTo(page)">{{ t('common.actions.retry') }}</button></div>
          </div>
        } @else if (items.length === 0) {
          <p class="state">{{ t('returns.manage.empty') }}</p>
        } @else {
          @for (r of items; track r.id) {
            <div class="panel-body">
              <h3>{{ r.number }} <span class="muted">· {{ t('returns.forOrder', { number: r.shopOrderNumber }) }}@if (mode === 'admin') { · {{ r.shopName }} }</span>
                <span class="badge" [class.badge-active]="r.status === 'refunded' || r.status === 'approved' || r.status === 'received'"
                  [class.badge-pending]="r.status === 'requested'" [class.badge-rejected]="r.status === 'rejected'">{{ t('returns.status.' + r.status) }}</span></h3>
              <p class="muted">{{ r.createdOnUtc | date: 'medium' }} · {{ t('returns.reasons.' + r.reason) }}</p>
              <ul>
                @for (l of r.lines; track l.id) {
                  <li>{{ l.quantity }} × {{ l.name }}@if (l.variantLabel) { ({{ l.variantLabel }}) } — {{ money(l.amount) }}</li>
                }
              </ul>
              <p><strong>{{ t('returns.refundAmount') }}: {{ money(r.refundAmount) }}</strong>
                @if (r.restocked) { <span class="muted"> · {{ t('returns.restocked') }}</span> }</p>
              @if (r.customerNote) { <p class="muted">{{ t('returns.customerNote') }}: {{ r.customerNote }}</p> }
              @if (r.resolutionNote) { <p>{{ t('returns.shopNote') }}: {{ r.resolutionNote }}</p> }

              @if (r.status === 'requested' || r.status === 'approved' || (r.status === 'received' && mode === 'admin')) {
                <div class="field">
                  @if (r.status === 'requested') {
                    <label [attr.for]="'note-' + r.id">{{ t('returns.manage.note') }}</label>
                    <textarea [id]="'note-' + r.id" [(ngModel)]="notes[r.id]" [name]="'note-' + r.id" rows="2" maxlength="500" style="width:100%"></textarea>
                  }
                  @if (r.status === 'approved') {
                    <label class="check-label"><input type="checkbox" [(ngModel)]="restock[r.id]" [name]="'restock-' + r.id" /> {{ t('returns.manage.restock') }}</label>
                  }
                  @if (r.status === 'received') {
                    <label class="check-label"><input type="checkbox" [(ngModel)]="manual[r.id]" [name]="'manual-' + r.id" /> {{ t('returns.manage.manual') }}</label>
                  }
                </div>
                <div class="row-actions">
                  @if (r.status === 'requested') {
                    <button type="button" class="btn btn-small" (click)="approve(r)" [disabled]="busy">{{ t('returns.manage.approve') }}</button>
                    <button type="button" class="btn btn-secondary btn-small" (click)="reject(r)" [disabled]="busy">{{ t('returns.manage.reject') }}</button>
                  }
                  @if (r.status === 'approved') {
                    <button type="button" class="btn btn-small" (click)="receive(r)" [disabled]="busy">{{ t('returns.manage.receive') }}</button>
                  }
                  @if (r.status === 'received') {
                    <button type="button" class="btn btn-small" (click)="refund(r)" [disabled]="busy">{{ t('returns.manage.refund') }}</button>
                  }
                </div>
              }
            </div>
          }
          <nav class="pagination" [attr.aria-label]="t('common.pagination.label')">
            <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page - 1)" [disabled]="page <= 1 || loading">{{ t('common.pagination.prev') }}</button>
            <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
            <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page + 1)" [disabled]="page >= totalPages || loading">{{ t('common.pagination.next') }}</button>
          </nav>
        }
      </div>
    }
    </ng-container>
  `
})
export class ReturnsManagePage implements OnInit {
  private readonly api = inject(ReturnApiService);
  private readonly auth = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly statuses = RETURN_STATUSES;

  mode: Mode = 'vendor';
  vendorId: number | null = null;
  items: ReturnRequest[] = [];
  status: ReturnStatus | '' = '';
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';
  busy = false;
  notice = '';
  actionError = '';
  /** What the person is typing or ticking, per return. */
  notes: Record<number, string> = {};
  restock: Record<number, boolean> = {};
  manual: Record<number, boolean> = {};

  ngOnInit() {
    this.mode = this.route.snapshot.data['mode'] === 'admin' ? 'admin' : 'vendor';
    this.currency.load();
    if (this.mode === 'admin') { this.goTo(1); return; }
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

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    const request = this.mode === 'admin'
      ? this.api.adminReturns(this.status, this.page, PAGE_SIZE)
      : this.api.shopReturns(this.vendorId!, this.status, this.page, PAGE_SIZE);
    request.subscribe({
      next: result => {
        this.items = result.items;
        this.totalPages = Math.max(result.totalPages, 1);
        this.loading = false;
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('returns.errors.load')); }
    });
  }

  approve(r: ReturnRequest) {
    const note = (this.notes[r.id] ?? '').trim();
    this.act(this.mode === 'admin' ? this.api.adminApprove(r.id, note) : this.api.shopApprove(this.vendorId!, r.id, note), 'approved');
  }

  reject(r: ReturnRequest) {
    const note = (this.notes[r.id] ?? '').trim();
    if (!note) { this.actionError = this.transloco.translate('returns.errors.reasonRequired'); return; }
    this.act(this.mode === 'admin' ? this.api.adminReject(r.id, note) : this.api.shopReject(this.vendorId!, r.id, note), 'rejected');
  }

  receive(r: ReturnRequest) {
    const restock = !!this.restock[r.id];
    this.act(this.mode === 'admin' ? this.api.adminReceive(r.id, restock) : this.api.shopReceive(this.vendorId!, r.id, restock), 'received');
  }

  refund(r: ReturnRequest) {
    this.act(this.api.adminRefund(r.id, !!this.manual[r.id]), 'refunded');
  }

  private act(request: ReturnType<ReturnApiService['adminRefund']>, done: ReturnStatus) {
    this.busy = true;
    this.notice = '';
    this.actionError = '';
    request.subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('returns.manage.done.' + done); this.goTo(this.page); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('returns.errors.action'));
        // Someone else may have decided meanwhile: show it as it is now.
        if (err?.status === 409 || err?.status === 404) this.goTo(this.page);
      }
    });
  }
}
