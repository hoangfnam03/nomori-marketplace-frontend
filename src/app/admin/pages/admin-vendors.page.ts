import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UpdateVendorRequest, VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorMemberResponse, VendorResponse } from '../../core/vendors/vendor.models';

interface VendorForm {
  name: string;
  email: string;
  description: string;
  adminComment: string;
  active: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="vendors-title">
      <div class="eyebrow">Admin / Vendors</div>
      <h1 id="vendors-title">Manage vendors.</h1>
      <p>
        Shops are created by approving a
        <a routerLink="/admin/vendor-applications">vendor application</a>.
        Members manage their own shop accounts from the vendor portal.
      </p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>Vendors</h2>
        <div class="actions">
          <input type="search" placeholder="Search vendors…" [(ngModel)]="searchTerm" (input)="onSearch()" name="vendorSearch" aria-label="Search vendors" />
        </div>
      </div>

      @if (loading) {
        <p class="state">Loading…</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
      } @else if (vendors.length === 0) {
        <p class="state">No vendors found.</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Order</th><th>Created</th><th></th></tr></thead>
            <tbody>
              @for (v of vendors; track v.id) {
                <tr [class.selected]="selected?.id === v.id">
                  <td><strong>{{ v.name }}</strong></td>
                  <td>{{ v.email }}</td>
                  <td><span [class]="v.active ? 'badge badge-active' : 'badge'">{{ v.active ? 'Active' : 'Inactive' }}</span></td>
                  <td>{{ v.displayOrder }}</td>
                  <td>{{ v.createdOnUtc | date:'mediumDate' }}</td>
                  <td class="row-actions">
                    <button type="button" class="btn btn-secondary btn-small" (click)="openForm(v)">Edit</button>
                    <button type="button" class="btn btn-secondary btn-small" (click)="showMembers(v)">Members</button>
                    <button type="button" class="btn btn-danger btn-small" (click)="askDelete(v)">Delete</button>
                  </td>
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

    @if (pendingDelete; as d) {
      <div class="panel">
        <div class="panel-body">
          <div class="confirm confirm-danger" role="alertdialog" aria-label="Confirm delete">
            <strong>Delete “{{ d.name }}”?</strong>
            <span class="muted">Every member loses seller access and is signed out. Their accounts remain as normal customer accounts.</span>
            @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
            <div class="actions">
              <button type="button" class="btn btn-danger" (click)="confirmDelete(d)" [disabled]="saving">{{ saving ? 'Deleting…' : 'Delete vendor' }}</button>
              <button type="button" class="btn btn-secondary" (click)="pendingDelete = null">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (formOpen) {
      <div class="panel">
        <div class="panel-header"><h2>Edit vendor</h2></div>
        <form class="form panel-body" (ngSubmit)="submitVendor()" aria-label="Edit vendor">
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
          <div class="form-row">
            <label>Name <input type="text" [(ngModel)]="form.name" name="name" required maxlength="400" /></label>
            <label>Email <input type="email" [(ngModel)]="form.email" name="email" required maxlength="320" /></label>
          </div>
          <label>Description <textarea [(ngModel)]="form.description" name="description" rows="2"></textarea></label>
          <label>Admin comment <textarea [(ngModel)]="form.adminComment" name="adminComment" rows="2"></textarea></label>
          <div class="form-row">
            <label class="check-label"><input type="checkbox" [(ngModel)]="form.active" name="active" /> Active</label>
            <label>Display order <input type="number" [(ngModel)]="form.displayOrder" name="displayOrder" /></label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      </div>
    }

    @if (selected; as v) {
      <div class="panel">
        <div class="panel-header"><h2>Members of {{ v.name }}</h2></div>
        @if (membersLoading) {
          <p class="state">Loading members…</p>
        } @else if (membersError) {
          <p class="state state-error" role="alert">{{ membersError }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>Account</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
              <tbody>
                @for (m of members; track m.customerId) {
                  <tr>
                    <td>{{ m.email }}@if (fullName(m)) { <br /><span class="muted">{{ fullName(m) }}</span> }</td>
                    <td><span [class]="'badge badge-' + m.status">{{ m.status === 'active' ? 'Active' : 'Pending setup' }}</span></td>
                    <td>{{ m.lastLoginDateUtc ? (m.lastLoginDateUtc | date:'medium') : '—' }}</td>
                    <td class="row-actions">
                      @if (pendingRemove?.customerId === m.customerId) {
                        <button type="button" class="btn btn-danger btn-small" (click)="removeMember(v, m)" [disabled]="saving">Confirm remove</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingRemove = null">Cancel</button>
                      } @else {
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingRemove = m" [disabled]="members.length <= 1" [title]="members.length <= 1 ? 'A shop must keep at least one member' : ''">Remove</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (members.length <= 1) { <p class="state">The last member cannot be removed. Delete the vendor to close the shop.</p> }
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
        }
      </div>
    }
  `
})
export class AdminVendorsPage implements OnInit {
  private readonly api = inject(VendorApiService);

  vendors: VendorResponse[] = [];
  loading = false;
  loadError = '';
  page = 1;
  readonly pageSize = 50;
  totalPages = 1;
  searchTerm = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  formOpen = false;
  editingId: number | null = null;
  form: VendorForm = this.emptyForm();
  saving = false;
  actionError = '';
  pendingDelete: VendorResponse | null = null;

  selected: VendorResponse | null = null;
  members: VendorMemberResponse[] = [];
  membersLoading = false;
  membersError = '';
  pendingRemove: VendorMemberResponse | null = null;

  ngOnInit() { this.loadVendors(); }

  loadVendors() {
    this.loading = true;
    this.loadError = '';
    this.api.getVendors(this.page, this.pageSize, this.searchTerm.trim() || undefined).subscribe({
      next: res => { this.vendors = res.items; this.totalPages = Math.max(res.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load vendors.'); }
    });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadVendors(); }, 300);
  }

  goPage(p: number) { this.page = p; this.loadVendors(); }

  openForm(v: VendorResponse) {
    this.editingId = v.id;
    this.form = {
      name: v.name, email: v.email, description: v.description ?? '',
      adminComment: v.adminComment ?? '', active: v.active ?? true, displayOrder: v.displayOrder
    };
    this.actionError = '';
    this.pendingDelete = null;
    this.formOpen = true;
  }

  closeForm() { this.formOpen = false; this.editingId = null; this.actionError = ''; }

  submitVendor() {
    if (!this.editingId) return;
    if (!this.form.name.trim() || !this.form.email.trim()) {
      this.actionError = 'Name and email are required.';
      return;
    }
    this.saving = true;
    this.actionError = '';
    const body: UpdateVendorRequest = {
      name: this.form.name,
      email: this.form.email,
      description: this.form.description || null,
      adminComment: this.form.adminComment || null,
      active: this.form.active,
      displayOrder: this.form.displayOrder
    };
    this.api.updateVendor(this.editingId, body).subscribe({
      next: () => { this.saving = false; this.closeForm(); this.loadVendors(); },
      error: err => { this.saving = false; this.actionError = vendorErrorMessage(err, 'Save failed.'); }
    });
  }

  askDelete(v: VendorResponse) {
    this.pendingDelete = v;
    this.actionError = '';
    this.formOpen = false;
  }

  confirmDelete(v: VendorResponse) {
    this.saving = true;
    this.actionError = '';
    this.api.deleteVendor(v.id).subscribe({
      next: () => {
        this.saving = false;
        this.pendingDelete = null;
        if (this.selected?.id === v.id) this.selected = null;
        this.loadVendors();
      },
      error: err => { this.saving = false; this.actionError = vendorErrorMessage(err, 'Delete failed.'); }
    });
  }

  showMembers(v: VendorResponse) {
    this.selected = v;
    this.pendingRemove = null;
    this.actionError = '';
    this.loadMembers(v);
  }

  removeMember(v: VendorResponse, m: VendorMemberResponse) {
    this.saving = true;
    this.actionError = '';
    this.api.removeMember(v.id, m.customerId).subscribe({
      next: () => { this.saving = false; this.pendingRemove = null; this.loadMembers(v); },
      error: err => {
        this.saving = false;
        this.pendingRemove = null;
        this.actionError = vendorErrorMessage(err, 'Unable to remove the member.');
        this.loadMembers(v);
      }
    });
  }

  fullName(m: VendorMemberResponse) {
    return [m.firstName, m.lastName].filter(Boolean).join(' ');
  }

  private loadMembers(v: VendorResponse) {
    this.membersLoading = true;
    this.membersError = '';
    this.api.getMembers(v.id).subscribe({
      next: members => { this.members = members; this.membersLoading = false; },
      error: err => { this.membersLoading = false; this.membersError = vendorErrorMessage(err, 'Unable to load members.'); }
    });
  }

  private emptyForm(): VendorForm {
    return { name: '', email: '', description: '', adminComment: '', active: true, displayOrder: 0 };
  }
}
