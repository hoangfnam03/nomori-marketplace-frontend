import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorApplicationResponse, VendorApplicationStatus } from '../../core/vendors/vendor.models';

type ReviewMode = 'approve' | 'reject' | null;

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="apps-title">
      <div class="eyebrow">{{ t('adminVendorApplications.eyebrow') }}</div>
      <h1 id="apps-title">{{ t('adminVendorApplications.title') }}</h1>
      <p>{{ t('adminVendorApplications.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('adminVendorApplications.heading') }}</h2>
        <div class="actions">
          <select [(ngModel)]="status" (ngModelChange)="onFilterChange()" name="status" [attr.aria-label]="t('adminVendorApplications.filterStatus')">
            <option value="pending">{{ t('vendorStatus.application.pending') }}</option>
            <option value="approved">{{ t('vendorStatus.application.approved') }}</option>
            <option value="rejected">{{ t('vendorStatus.application.rejected') }}</option>
            <option value="cancelled">{{ t('vendorStatus.application.cancelled') }}</option>
            <option value="">{{ t('storefront.products.all') }}</option>
          </select>
          <input type="search" name="search" [placeholder]="t('adminVendorApplications.searchPlaceholder')" [(ngModel)]="search" (input)="onSearch()" [attr.aria-label]="t('adminVendorApplications.search')" />
        </div>
      </div>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
      } @else if (items.length === 0) {
        <p class="state">{{ t('adminVendorApplications.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>{{ t('admin.catalog.shop') }}</th><th>{{ t('adminVendorApplications.applicant') }}</th><th>{{ t('admin.common.status') }}</th><th>{{ t('adminVendorApplications.submitted') }}</th><th></th></tr></thead>
            <tbody>
              @for (a of items; track a.id) {
                <tr [class.selected]="selected?.id === a.id">
                  <td><strong>{{ a.shopName }}</strong><br /><span class="muted">{{ a.email }}</span></td>
                  <td>{{ a.customerEmail }}</td>
                  <td><span [class]="'badge badge-' + a.status">{{ statusLabel(a.status) }}</span></td>
                  <td>{{ a.createdOnUtc | date:'dd/MM/yyyy' }}</td>
                  <td class="row-actions"><button type="button" class="btn btn-secondary btn-small" (click)="select(a)">{{ t('adminVendorApplications.details') }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="page === 1" (click)="goPage(page - 1)">‹ {{ t('common.pagination.prev') }}</button>
            <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
            <button type="button" [disabled]="page === totalPages" (click)="goPage(page + 1)">{{ t('common.pagination.next') }} ›</button>
          </div>
        }
      }
    </div>

    @if (selected; as a) {
      <div class="panel">
        <div class="panel-header"><h2>{{ a.shopName }}</h2><span [class]="'badge badge-' + a.status">{{ statusLabel(a.status) }}</span></div>
        <div class="panel-body">
          <dl class="detail-grid">
            <dt>{{ t('adminVendorApplications.applicant') }}</dt><dd>{{ a.customerEmail }} (#{{ a.customerId }})</dd>
            <dt>{{ t('vendor.portal.contactEmail') }}</dt><dd>{{ a.email }}</dd>
            <dt>{{ t('becomeVendor.fields.shopName') }}</dt><dd>{{ a.shopName }}</dd>
            <dt>{{ t('customer.fields.phone') }}</dt><dd>{{ a.phoneNumber }}</dd>
            <dt>{{ t('adminVendorApplications.taxCode') }}</dt><dd>{{ a.taxCode || '—' }}</dd>
            <dt>{{ t('adminVendorApplications.businessAddress') }}</dt><dd>{{ a.businessAddress || '—' }}</dd>
            <dt>{{ t('admin.common.description') }}</dt><dd>{{ a.description || '—' }}</dd>
            <dt>{{ t('adminVendorApplications.submitted') }}</dt><dd>{{ a.createdOnUtc | date:'dd/MM/yyyy HH:mm' }}</dd>
            @if (a.reviewedOnUtc) { <dt>{{ t('adminVendorApplications.reviewed') }}</dt><dd>{{ a.reviewedOnUtc | date:'dd/MM/yyyy HH:mm' }}</dd> }
            @if (a.rejectReason) { <dt>{{ t('adminVendorApplications.rejectReason') }}</dt><dd>{{ a.rejectReason }}</dd> }
            @if (a.vendorId) { <dt>{{ t('admin.catalog.shop') }}</dt><dd>#{{ a.vendorId }}</dd> }
          </dl>

          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

          @if (a.status === 'pending') {
            @if (mode === 'approve') {
              <div class="confirm" role="dialog" [attr.aria-label]="t('adminVendorApplications.approveLabel')">
                <strong>{{ t('adminVendorApplications.approveConfirm') }}</strong>
                <span class="muted">{{ t('adminVendorApplications.approveHint') }}</span>
                <label>{{ t('adminVendorApplications.internalComment') }}
                  <textarea name="approveComment" rows="2" [(ngModel)]="adminComment"></textarea>
                </label>
                <div class="actions">
                  <button type="button" class="btn" (click)="approve(a)" [disabled]="busy">{{ busy ? t('adminVendorApplications.approving') : t('adminVendorApplications.confirmApproval') }}</button>
                  <button type="button" class="btn btn-secondary" (click)="mode = null">{{ t('common.actions.cancel') }}</button>
                </div>
              </div>
            } @else if (mode === 'reject') {
              <div class="confirm confirm-danger" role="dialog" [attr.aria-label]="t('adminVendorApplications.rejectLabel')">
                <strong>{{ t('adminVendorApplications.rejectConfirm') }}</strong>
                <label>{{ t('adminVendorApplications.rejectReasonLabel') }} *
                  <textarea name="rejectReason" rows="3" maxlength="2000" [(ngModel)]="reason"></textarea>
                </label>
                <div class="actions">
                  <button type="button" class="btn btn-danger" (click)="reject(a)" [disabled]="busy || !reason.trim()">{{ busy ? t('adminVendorApplications.rejecting') : t('adminVendorApplications.rejectLabel') }}</button>
                  <button type="button" class="btn btn-secondary" (click)="mode = null">{{ t('common.actions.cancel') }}</button>
                </div>
              </div>
            } @else {
              <div class="actions">
                <button type="button" class="btn" (click)="openMode('approve', a)">{{ t('adminVendorApplications.approve') }}</button>
                <button type="button" class="btn btn-danger" (click)="openMode('reject', a)">{{ t('adminVendorApplications.reject') }}</button>
              </div>
            }
          }
        </div>
      </div>
    }
    </ng-container>
  `
})
export class AdminVendorApplicationsPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly transloco = inject(TranslocoService);

  items: VendorApplicationResponse[] = [];
  selected: VendorApplicationResponse | null = null;
  status: VendorApplicationStatus | '' = 'pending';
  search = '';
  page = 1;
  totalPages = 1;
  loading = false;
  loadError = '';

  mode: ReviewMode = null;
  approveShopName = '';
  adminComment = '';
  reason = '';
  busy = false;
  actionError = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.getApplications({ status: this.status || undefined, search: this.search.trim() || undefined, page: this.page }).subscribe({
      next: res => {
        this.items = res.items;
        this.totalPages = Math.max(res.totalPages, 1);
        this.loading = false;
        if (this.selected) this.selected = res.items.find(i => i.id === this.selected!.id) ?? null;
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('adminVendorApplications.errors.load')); }
    });
  }

  onFilterChange() { this.page = 1; this.selected = null; this.load(); }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 300);
  }

  goPage(p: number) { this.page = p; this.load(); }

  select(a: VendorApplicationResponse) {
    this.selected = a;
    this.mode = null;
    this.actionError = '';
  }

  openMode(mode: Exclude<ReviewMode, null>, a: VendorApplicationResponse) {
    this.mode = mode;
    this.actionError = '';
    this.approveShopName = a.shopName;
    this.adminComment = '';
    this.reason = '';
  }

  approve(a: VendorApplicationResponse) {
    const name = this.approveShopName.trim();
    this.run(a, {
      status: 'approved',
      shopName: name && name !== a.shopName ? name : null,
      adminComment: this.adminComment.trim() || null
    });
  }

  reject(a: VendorApplicationResponse) {
    this.run(a, { status: 'rejected', reason: this.reason.trim() });
  }

  statusLabel(s: VendorApplicationStatus) {
    return this.transloco.translate('vendorStatus.application.' + s);
  }

  private run(a: VendorApplicationResponse, body: Parameters<VendorApiService['changeApplicationStatus']>[1]) {
    this.busy = true;
    this.actionError = '';
    this.api.changeApplicationStatus(a.id, body).subscribe({
      next: updated => { this.busy = false; this.mode = null; this.selected = updated; this.load(); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('adminVendorApplications.errors.update'));
        // The application may have been handled by someone else; refresh the list.
        if (err?.status === 409) this.load();
      }
    });
  }
}
