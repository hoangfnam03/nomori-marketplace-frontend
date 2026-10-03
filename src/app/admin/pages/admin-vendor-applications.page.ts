import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorApplicationResponse, VendorApplicationStatus } from '../../core/vendors/vendor.models';

type ReviewMode = 'approve' | 'reject' | null;

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="apps-title">
      <div class="eyebrow">Admin / Vendor applications</div>
      <h1 id="apps-title">Review shop applications.</h1>
      <p>Approving an application creates the shop and makes the applicant its first member.</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>Applications</h2>
        <div class="actions">
          <select [(ngModel)]="status" (ngModelChange)="onFilterChange()" name="status" aria-label="Filter by status">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All</option>
          </select>
          <input type="search" name="search" placeholder="Shop name or email…" [(ngModel)]="search" (input)="onSearch()" aria-label="Search applications" />
        </div>
      </div>

      @if (loading) {
        <p class="state">Loading…</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
      } @else if (items.length === 0) {
        <p class="state">No applications found.</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Shop</th><th>Applicant</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              @for (a of items; track a.id) {
                <tr [class.selected]="selected?.id === a.id">
                  <td><strong>{{ a.shopName }}</strong><br /><span class="muted">{{ a.email }}</span></td>
                  <td>{{ a.customerEmail }}</td>
                  <td><span [class]="'badge badge-' + a.status">{{ statusLabel(a.status) }}</span></td>
                  <td>{{ a.createdOnUtc | date:'mediumDate' }}</td>
                  <td class="row-actions"><button type="button" class="btn btn-secondary btn-small" (click)="select(a)">Details</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="page === 1" (click)="goPage(page - 1)">‹ Prev</button>
            <span>Page {{ page }} of {{ totalPages }}</span>
            <button type="button" [disabled]="page === totalPages" (click)="goPage(page + 1)">Next ›</button>
          </div>
        }
      }
    </div>

    @if (selected; as a) {
      <div class="panel">
        <div class="panel-header"><h2>{{ a.shopName }}</h2><span [class]="'badge badge-' + a.status">{{ statusLabel(a.status) }}</span></div>
        <div class="panel-body">
          <dl class="detail-grid">
            <dt>Applicant</dt><dd>{{ a.customerEmail }} (#{{ a.customerId }})</dd>
            <dt>Contact email</dt><dd>{{ a.email }}</dd>
            <dt>Phone</dt><dd>{{ a.phoneNumber }}</dd>
            <dt>Tax code</dt><dd>{{ a.taxCode || '—' }}</dd>
            <dt>Business address</dt><dd>{{ a.businessAddress || '—' }}</dd>
            <dt>Description</dt><dd>{{ a.description || '—' }}</dd>
            <dt>Submitted</dt><dd>{{ a.createdOnUtc | date:'medium' }}</dd>
            @if (a.reviewedOnUtc) { <dt>Reviewed</dt><dd>{{ a.reviewedOnUtc | date:'medium' }}</dd> }
            @if (a.rejectReason) { <dt>Reject reason</dt><dd>{{ a.rejectReason }}</dd> }
            @if (a.vendorId) { <dt>Vendor</dt><dd>#{{ a.vendorId }}</dd> }
          </dl>

          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

          @if (a.status === 'pending') {
            @if (mode === 'approve') {
              <div class="confirm" role="dialog" aria-label="Approve application">
                <strong>Approve this application?</strong>
                <span class="muted">The shop is created and active immediately, and the applicant becomes its first member.</span>
                <label>Shop name (optional override)
                  <input type="text" name="approveName" [(ngModel)]="approveShopName" maxlength="400" />
                </label>
                <label>Internal comment (optional)
                  <textarea name="approveComment" rows="2" [(ngModel)]="adminComment"></textarea>
                </label>
                <div class="actions">
                  <button type="button" class="btn" (click)="approve(a)" [disabled]="busy">{{ busy ? 'Approving…' : 'Confirm approval' }}</button>
                  <button type="button" class="btn btn-secondary" (click)="mode = null">Cancel</button>
                </div>
              </div>
            } @else if (mode === 'reject') {
              <div class="confirm confirm-danger" role="dialog" aria-label="Reject application">
                <strong>Reject this application?</strong>
                <label>Reason (sent to the applicant) *
                  <textarea name="rejectReason" rows="3" maxlength="2000" [(ngModel)]="reason"></textarea>
                </label>
                <div class="actions">
                  <button type="button" class="btn btn-danger" (click)="reject(a)" [disabled]="busy || !reason.trim()">{{ busy ? 'Rejecting…' : 'Reject application' }}</button>
                  <button type="button" class="btn btn-secondary" (click)="mode = null">Cancel</button>
                </div>
              </div>
            } @else {
              <div class="actions">
                <button type="button" class="btn" (click)="openMode('approve', a)">Approve</button>
                <button type="button" class="btn btn-danger" (click)="openMode('reject', a)">Reject</button>
              </div>
            }
          }
        </div>
      </div>
    }
  `
})
export class AdminVendorApplicationsPage implements OnInit {
  private readonly api = inject(VendorApiService);

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
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load applications.'); }
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
    return { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' }[s];
  }

  private run(a: VendorApplicationResponse, body: Parameters<VendorApiService['changeApplicationStatus']>[1]) {
    this.busy = true;
    this.actionError = '';
    this.api.changeApplicationStatus(a.id, body).subscribe({
      next: updated => { this.busy = false; this.mode = null; this.selected = updated; this.load(); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, 'Unable to update the application.');
        // The application may have been handled by someone else; refresh the list.
        if (err?.status === 409) this.load();
      }
    });
  }
}
