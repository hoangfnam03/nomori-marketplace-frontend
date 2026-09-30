import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ManufacturerResponse, SelectableCategory } from '../../core/catalog/catalog.models';
import { ProductStatus, SaveVendorProductRequest, VendorProduct, VendorProductApiService } from '../../core/catalog/vendor-product-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface ProductForm {
  name: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  categoryIds: number[];
  manufacturerIds: number[];
}

type StatusFilter = 'all' | ProductStatus;

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="products-title">
      <div class="eyebrow">Vendor portal / Products</div>
      <h1 id="products-title">Your products.</h1>
      <p>Create and manage the products of your shop. <a routerLink="/vendor">Back to shop</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">Your account does not belong to a shop.</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <h2>Products</h2>
          <div class="actions">
            <select [(ngModel)]="status" (ngModelChange)="onFilterChange()" name="status" aria-label="Filter by status">
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="stopped">Stopped</option>
              <option value="hiddenByAdmin">Hidden by admin</option>
            </select>
            <input type="search" name="search" placeholder="Search products…" [(ngModel)]="search" (input)="onSearch()" aria-label="Search products" />
            <button type="button" class="btn" (click)="openForm()">+ New product</button>
          </div>
        </div>

        @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }

        @if (loading) {
          <p class="state">Loading…</p>
        } @else if (loadError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
          </div>
        } @else if (products.length === 0) {
          <p class="state">No products yet.</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (p of products; track p.id) {
                  <tr>
                    <td>
                      <strong>{{ p.name }}</strong>
                      @if (p.status === 'hiddenByAdmin') {
                        <div class="hidden-note">
                          Hidden by an administrator: {{ p.hiddenReason }}
                          @if (p.reviewRequestedOnUtc) { <br /><span class="muted">Review requested.</span> }
                        </div>
                      }
                    </td>
                    <td>{{ money(p.price) }}@if (p.oldPrice > 0) { <br /><span class="muted">was {{ money(p.oldPrice) }}</span> }</td>
                    <td>{{ p.stockQuantity }}</td>
                    <td><span [class]="statusClass(p.status)">{{ statusLabel(p.status) }}</span></td>
                    <td class="row-actions">
                      @if (pendingDelete?.id === p.id) {
                        <span class="muted">Delete this product?</span>
                        <button type="button" class="btn btn-danger btn-small" (click)="remove(p)" [disabled]="busy">Delete</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">Cancel</button>
                      } @else {
                        @if (p.status === 'draft' || p.status === 'stopped') {
                          <button type="button" class="btn btn-small" (click)="changeStatus(p, 'live')" [disabled]="busy">Publish</button>
                        }
                        @if (p.status === 'live') {
                          <button type="button" class="btn btn-secondary btn-small" (click)="changeStatus(p, 'stopped')" [disabled]="busy">Stop selling</button>
                        }
                        @if (p.status === 'hiddenByAdmin' && !p.reviewRequestedOnUtc) {
                          <button type="button" class="btn btn-secondary btn-small" (click)="askReview(p)" [disabled]="busy">Request review</button>
                        }
                        <button type="button" class="btn btn-secondary btn-small" (click)="edit(p)">Edit</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = p">Delete</button>
                      }
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
        @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
      </div>

      @if (formOpen) {
        <div class="panel">
          <div class="panel-header"><h2>{{ editingId ? 'Edit product' : 'New product' }}</h2></div>
          <form class="form panel-body" (ngSubmit)="save()" novalidate>
            @if (formError) { <p class="banner" role="alert">{{ formError }}</p> }
            <label>Name *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="400" required />
              @if (fieldError('name')) { <span class="field-error">{{ fieldError('name') }}</span> }
            </label>
            <label>Short description
              <textarea name="shortDescription" rows="2" [(ngModel)]="form.shortDescription"></textarea>
            </label>
            <label>Description
              <textarea name="fullDescription" rows="4" [(ngModel)]="form.fullDescription"></textarea>
              <span class="hint">Plain text. Formatting is not supported yet.</span>
            </label>
            <div class="form-row">
              <label>Price *
                <input type="number" name="price" [(ngModel)]="form.price" min="0" step="0.01" />
                @if (fieldError('price')) { <span class="field-error">{{ fieldError('price') }}</span> }
              </label>
              <label>Compare at price
                <input type="number" name="oldPrice" [(ngModel)]="form.oldPrice" min="0" step="0.01" />
                <span class="hint">Must be higher than the price. Leave 0 for none.</span>
                @if (fieldError('oldPrice')) { <span class="field-error">{{ fieldError('oldPrice') }}</span> }
              </label>
              <label>Stock
                <input type="number" name="stockQuantity" [(ngModel)]="form.stockQuantity" min="0" />
                @if (fieldError('stockQuantity')) { <span class="field-error">{{ fieldError('stockQuantity') }}</span> }
              </label>
            </div>

            <fieldset class="pick-list">
              <legend>Categories * <span class="hint">(up to 10)</span></legend>
              @if (categories.length === 0) { <span class="muted">No categories available.</span> }
              @for (c of categories; track c.id) {
                <label class="check-label"><input type="checkbox" [checked]="form.categoryIds.includes(c.id)" (change)="toggle(form.categoryIds, c.id)" [name]="'cat' + c.id" /> {{ c.path }}</label>
              }
              @if (fieldError('categoryIds')) { <span class="field-error">{{ fieldError('categoryIds') }}</span> }
            </fieldset>
            <fieldset class="pick-list">
              <legend>Manufacturers <span class="hint">(up to 10)</span></legend>
              @if (manufacturers.length === 0) { <span class="muted">No manufacturers available.</span> }
              @for (m of manufacturers; track m.id) {
                <label class="check-label"><input type="checkbox" [checked]="form.manufacturerIds.includes(m.id)" (change)="toggle(form.manufacturerIds, m.id)" [name]="'mfr' + m.id" /> {{ m.name }}</label>
              }
              @if (fieldError('manufacturerIds')) { <span class="field-error">{{ fieldError('manufacturerIds') }}</span> }
            </fieldset>

            <p class="muted">New products start as drafts. Publish them from the list when they are ready.</p>

            <div class="actions">
              <button type="submit" class="btn" [disabled]="busy || !form.name.trim()">{{ busy ? 'Saving…' : 'Save product' }}</button>
              <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
            </div>
          </form>
        </div>
      }
    }
  `,
  styles: [`
    .hidden-note { margin-top: .3rem; padding: .35rem .6rem; border-left: 3px solid #b74e3c; background: #f8e9e4; color: #7d3026; font-size: .8rem; }
    .pick-list { border: 1px solid var(--line); border-radius: 6px; padding: .6rem .9rem; display: grid; gap: .35rem; max-height: 200px; overflow: auto; }
    .pick-list legend { font-size: .8rem; padding: 0 .3rem; }
  `]
})
export class VendorProductsPage implements OnInit {
  private readonly api = inject(VendorProductApiService);
  private readonly catalog = inject(CatalogApiService);
  private readonly auth = inject(AuthFacade);

  vendorId: number | null = null;
  products: VendorProduct[] = [];
  categories: SelectableCategory[] = [];
  manufacturers: ManufacturerResponse[] = [];
  loading = true;
  loadError = '';
  status: StatusFilter = 'all';
  search = '';
  page = 1;
  totalPages = 1;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  formOpen = false;
  editingId: number | null = null;
  form: ProductForm = this.emptyForm();
  formError = '';
  fieldErrors: Record<string, string[]> = {};
  busy = false;
  notice = '';
  actionError = '';
  pendingDelete: VendorProduct | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        this.loadOptions();
        this.fetch();
      },
      error: () => { this.loading = false; this.loadError = 'Unable to load your account.'; }
    });
  }

  onFilterChange() { this.page = 1; this.fetch(); }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.fetch(); }, 300);
  }

  goPage(p: number) { this.page = p; this.fetch(); }

  openForm() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.clearErrors();
    this.formOpen = true;
  }

  edit(product: VendorProduct) {
    if (!this.vendorId) return;
    this.clearErrors();
    // The list does not include category ids, so read the full product first.
    this.api.get(this.vendorId, product.id).subscribe({
      next: full => {
        this.editingId = full.id;
        this.form = {
          name: full.name,
          shortDescription: full.shortDescription ?? '',
          fullDescription: full.fullDescription ?? '',
          price: full.price, oldPrice: full.oldPrice, stockQuantity: full.stockQuantity,
          categoryIds: [...(full.categoryIds ?? [])],
          manufacturerIds: [...(full.manufacturerIds ?? [])]
        };
        this.formOpen = true;
      },
      error: err => { this.actionError = vendorErrorMessage(err, 'Unable to load the product.'); }
    });
  }

  closeForm() { this.formOpen = false; this.editingId = null; this.clearErrors(); }

  save() {
    if (!this.vendorId || !this.form.name.trim()) return;
    this.busy = true;
    this.clearErrors();
    const body: SaveVendorProductRequest = {
      name: this.form.name,
      shortDescription: this.form.shortDescription || null,
      fullDescription: this.form.fullDescription || null,
      price: this.form.price, oldPrice: this.form.oldPrice, stockQuantity: this.form.stockQuantity,
      categoryIds: this.form.categoryIds,
      manufacturerIds: this.form.manufacturerIds
    };
    const request = this.editingId
      ? this.api.update(this.vendorId, this.editingId, body)
      : this.api.create(this.vendorId, body);
    request.subscribe({
      next: saved => {
        this.busy = false;
        this.closeForm();
        this.notice = `“${saved.name}” saved.`;
        this.fetch();
      },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.formError = Object.keys(this.fieldErrors).length ? '' : this.writeError(err, 'Unable to save the product.');
      }
    });
  }

  remove(product: VendorProduct) {
    if (!this.vendorId) return;
    this.busy = true;
    this.actionError = '';
    this.api.delete(this.vendorId, product.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; this.notice = `“${product.name}” deleted.`; this.fetch(); },
      error: err => { this.busy = false; this.pendingDelete = null; this.actionError = this.writeError(err, 'Unable to delete the product.'); }
    });
  }

  changeStatus(product: VendorProduct, target: 'live' | 'stopped') {
    if (!this.vendorId) return;
    this.busy = true;
    this.clearErrors();
    this.api.setStatus(this.vendorId, product.id, target).subscribe({
      next: () => {
        this.busy = false;
        this.notice = target === 'live' ? `“${product.name}” is now on sale.` : `“${product.name}” is no longer on sale.`;
        this.fetch();
      },
      error: err => {
        this.busy = false;
        const fields = err?.fieldErrors ? Object.values(err.fieldErrors as Record<string, string[]>).flat().join(' ') : '';
        this.actionError = fields || this.writeError(err, 'Unable to change the product status.');
        // The product may have been hidden meanwhile; show its real state.
        if (err?.status === 409) this.fetch();
      }
    });
  }

  askReview(product: VendorProduct) {
    if (!this.vendorId) return;
    this.busy = true;
    this.clearErrors();
    this.api.requestReview(this.vendorId, product.id).subscribe({
      next: () => { this.busy = false; this.notice = 'Review requested. An administrator will look at it.'; this.fetch(); },
      error: err => { this.busy = false; this.actionError = this.writeError(err, 'Unable to request a review.'); this.fetch(); }
    });
  }

  statusLabel(status: ProductStatus) {
    return { draft: 'Draft', live: 'Live', stopped: 'Stopped', hiddenByAdmin: 'Hidden by admin' }[status];
  }

  statusClass(status: ProductStatus) {
    return { draft: 'badge', live: 'badge badge-approved', stopped: 'badge badge-cancelled', hiddenByAdmin: 'badge badge-rejected' }[status];
  }

  toggle(list: number[], id: number) {
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1);
    else list.push(id);
  }

  fieldError(field: string) { return this.fieldErrors[field]?.[0] ?? ''; }

  money(value: number) { return value % 1 === 0 ? `$${value}` : `$${value.toFixed(2)}`; }

  private fetch() {
    if (!this.vendorId) return;
    this.loading = true;
    this.api.list(this.vendorId, {
      page: this.page,
      search: this.search.trim() || undefined,
      status: this.status === 'all' ? undefined : this.status
    }).subscribe({
      next: res => { this.products = res.items; this.totalPages = Math.max(res.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load products.'); }
    });
  }

  private loadOptions() {
    this.catalog.getSelectableCategories().subscribe({ next: c => { this.categories = c; }, error: () => { this.categories = []; } });
    this.catalog.getManufacturers(1, 100).subscribe({ next: r => { this.manufacturers = r.items; }, error: () => { this.manufacturers = []; } });
  }

  // A 403 on a write means the shop is switched off.
  private writeError(err: { status?: number; message?: string; fieldErrors?: Record<string, string[]> }, fallback: string) {
    return err.status === 403
      ? 'Your shop is inactive, so products cannot be changed right now.'
      : vendorErrorMessage(err, fallback);
  }

  private clearErrors() { this.formError = ''; this.fieldErrors = {}; this.actionError = ''; this.notice = ''; }

  private emptyForm(): ProductForm {
    return { name: '', shortDescription: '', fullDescription: '', price: 0, oldPrice: 0, stockQuantity: 0, categoryIds: [], manufacturerIds: [] };
  }
}
