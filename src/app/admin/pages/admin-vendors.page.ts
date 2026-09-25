import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VendorApiService, SaveVendorRequest } from '../../core/vendors/vendor-api.service';
import { VendorAdminResponse } from '../../core/vendors/vendor.models';

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
  imports: [FormsModule],
  template: `
    <section class="admin-intro" aria-labelledby="vendors-title">
      <div>
        <div class="eyebrow">Admin / Vendors</div>
        <h1 id="vendors-title">Manage vendors.</h1>
        <p>Create vendor profiles and link them to customer accounts. Each customer can be assigned to one vendor.</p>
      </div>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>Vendors</h2>
        <div class="panel-header-actions">
          <input
            type="search"
            placeholder="Search vendors…"
            [(ngModel)]="searchTerm"
            (input)="onSearch()"
            name="vendorSearch"
            aria-label="Search vendors"
            style="min-width:200px"
          />
          <button type="button" class="new-btn" (click)="openForm()">+ New vendor</button>
        </div>
      </div>

      @if (formOpen) {
        <form class="inline-form" (ngSubmit)="submitVendor()" [attr.aria-label]="(editingId ? 'Edit' : 'Create') + ' vendor'">
          <div class="form-title">{{ editingId ? 'Edit vendor' : 'New vendor' }}</div>
          @if (formError) { <p class="form-error" role="alert">{{ formError }}</p> }
          <div class="form-row">
            <label>Name <input type="text" [(ngModel)]="form.name" name="name" required /></label>
            <label>Email <input type="email" [(ngModel)]="form.email" name="email" required /></label>
          </div>
          <label>Description <textarea [(ngModel)]="form.description" name="description" rows="2"></textarea></label>
          <label>Admin comment <textarea [(ngModel)]="form.adminComment" name="adminComment" rows="2"></textarea></label>
          <div class="form-row">
            <label class="check-label"><input type="checkbox" [(ngModel)]="form.active" name="active" /> Active</label>
            <label>Display order <input type="number" [(ngModel)]="form.displayOrder" name="displayOrder" style="width:80px" /></label>
          </div>
          <div class="form-actions">
            <button type="submit" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="cancel-btn" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      }

      @if (loading) {
        <p class="loading-msg">Loading…</p>
      } @else if (vendors.length === 0) {
        <p class="empty-msg">No vendors found.</p>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Order</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (v of vendors; track v.id) {
              <tr>
                <td><strong>{{ v.name }}</strong></td>
                <td>{{ v.email }}</td>
                <td>
                  <span [class]="v.active ? 'status-active' : 'status-inactive'">
                    {{ v.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ v.displayOrder }}</td>
                <td>{{ formatDate(v.createdOnUtc) }}</td>
                <td class="row-actions">
                  <button type="button" class="edit-btn" (click)="openForm(v)">Edit</button>
                  <button type="button" class="delete-btn" (click)="deleteVendor(v)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (totalPages > 1) {
          <div class="pagination">
            <button [disabled]="page === 1" (click)="goPage(page - 1)">‹ Prev</button>
            <span>Page {{ page }} of {{ totalPages }}</span>
            <button [disabled]="page === totalPages" (click)="goPage(page + 1)">Next ›</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .admin-intro {
      padding: 2.5rem var(--page-gutter, 2rem) 2rem;
      border-bottom: 1px solid var(--line);
    }
    .eyebrow {
      font-family: var(--mono-font);
      font-size: .75rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: .4rem;
    }
    h1 { font-family: var(--display-font); font-size: 2rem; margin: 0 0 .5rem; }
    p { color: var(--muted); margin: 0; }

    .panel {
      margin: 2rem var(--page-gutter, 2rem);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--line);
      flex-wrap: wrap;
      gap: .75rem;
    }
    .panel-header h2 { margin: 0; font-size: 1rem; }
    .panel-header-actions { display: flex; gap: .75rem; align-items: center; }

    input[type=search], input[type=text], input[type=email], input[type=number], textarea {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: .4rem .7rem;
      background: var(--paper);
      color: var(--ink);
      font-size: .9rem;
    }
    input[type=search]:focus, input[type=text]:focus, input[type=email]:focus,
    input[type=number]:focus, textarea:focus {
      outline: 2px solid var(--green);
      outline-offset: 1px;
    }

    .new-btn {
      background: var(--green);
      color: var(--paper);
      border: none;
      border-radius: 6px;
      padding: .45rem 1rem;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .inline-form {
      margin: 1.25rem 1.5rem;
      padding: 1.25rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .form-title { font-weight: 600; font-size: .95rem; }
    .form-error { color: #d32f2f; font-size: .875rem; margin: 0; }
    .inline-form label { display: flex; flex-direction: column; gap: .3rem; font-size: .875rem; font-weight: 500; }
    .inline-form input, .inline-form textarea { width: 100%; box-sizing: border-box; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .form-row label { flex: 1; min-width: 160px; }
    .check-label { flex-direction: row !important; align-items: center; gap: .5rem !important; cursor: pointer; }
    .form-actions { display: flex; gap: .75rem; margin-top: .25rem; }
    .form-actions button {
      border: 1px solid var(--green);
      border-radius: 6px;
      padding: .4rem .9rem;
      font-size: .875rem;
      cursor: pointer;
    }
    .form-actions button[type=submit] { background: var(--green); color: var(--paper); font-weight: 600; border: none; }
    .form-actions button[type=submit]:disabled { opacity: .5; cursor: not-allowed; }
    .cancel-btn { background: transparent; color: var(--ink); }

    .loading-msg, .empty-msg { padding: 2rem 1.5rem; color: var(--muted); font-size: .9rem; }

    .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .data-table th {
      text-align: left;
      padding: .6rem 1rem;
      background: var(--paper);
      border-bottom: 1px solid var(--line);
      font-size: .75rem;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--muted);
    }
    .data-table td { padding: .65rem 1rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: color-mix(in srgb, var(--green) 4%, var(--paper)); }

    .status-active { color: var(--green); font-weight: 600; font-size: .8rem; }
    .status-inactive { color: var(--muted); font-size: .8rem; }

    .row-actions { display: flex; gap: .5rem; }
    .edit-btn, .delete-btn {
      border-radius: 4px;
      padding: .25rem .6rem;
      font-size: .8rem;
      cursor: pointer;
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
    }
    .delete-btn { color: #d32f2f; border-color: #d32f2f20; }
    .delete-btn:hover { background: #d32f2f10; }

    .pagination {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: .75rem 1.5rem;
      border-top: 1px solid var(--line);
      font-size: .875rem;
    }
    .pagination button {
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: .25rem .6rem;
      background: var(--paper);
      cursor: pointer;
    }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class AdminVendorsPage implements OnInit {
  private readonly api = inject(VendorApiService);

  vendors: VendorAdminResponse[] = [];
  loading = false;
  page = 1;
  pageSize = 50;
  totalPages = 1;
  searchTerm = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  formOpen = false;
  editingId: number | null = null;
  saving = false;
  formError = '';
  form: VendorForm = this.emptyForm();

  ngOnInit() { this.loadVendors(); }

  loadVendors() {
    this.loading = true;
    this.api.adminGetVendors(this.page, this.pageSize, this.searchTerm || undefined).subscribe({
      next: res => {
        this.vendors = res.items;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadVendors(); }, 300);
  }

  goPage(p: number) { this.page = p; this.loadVendors(); }

  openForm(v?: VendorAdminResponse) {
    if (v) {
      this.editingId = v.id;
      this.form = { name: v.name, email: v.email, description: v.description ?? '', adminComment: '', active: v.active, displayOrder: v.displayOrder };
    } else {
      this.editingId = null;
      this.form = this.emptyForm();
    }
    this.formError = '';
    this.formOpen = true;
  }

  closeForm() { this.formOpen = false; this.editingId = null; }

  submitVendor() {
    if (!this.form.name.trim() || !this.form.email.trim()) {
      this.formError = 'Name and email are required.';
      return;
    }
    this.saving = true;
    this.formError = '';
    const body: SaveVendorRequest = {
      name: this.form.name,
      email: this.form.email,
      description: this.form.description || null,
      adminComment: this.form.adminComment || null,
      active: this.form.active,
      displayOrder: this.form.displayOrder
    };
    const req = this.editingId
      ? this.api.adminUpdateVendor(this.editingId, body)
      : this.api.adminCreateVendor(body);
    req.subscribe({
      next: () => { this.saving = false; this.closeForm(); this.loadVendors(); },
      error: err => {
        this.saving = false;
        this.formError = err?.error?.errors ? Object.values(err.error.errors).flat().join(' ') : 'Save failed.';
      }
    });
  }

  deleteVendor(v: VendorAdminResponse) {
    if (!confirm(`Delete vendor "${v.name}"?`)) return;
    this.api.adminDeleteVendor(v.id).subscribe({ next: () => this.loadVendors() });
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private emptyForm(): VendorForm {
    return { name: '', email: '', description: '', adminComment: '', active: true, displayOrder: 0 };
  }
}
