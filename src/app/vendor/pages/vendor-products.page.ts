import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ManufacturerResponse, SelectableCategory } from '../../core/catalog/catalog.models';
import { ProductStatus, SaveVendorProductRequest, VendorProduct, VendorProductApiService } from '../../core/catalog/vendor-product-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { CurrencyService } from '../../core/money/currency.service';
import { MEDIA_ACCEPT, MEDIA_MAX_BYTES, MediaApiService } from '../../core/media/media-api.service';

const MAX_PICTURES = 10;

interface ProductForm {
  name: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  categoryIds: number[];
  manufacturerIds: number[];
  pictureIds: number[];
  sku: string;
  gtin: string;
  manufacturerPartNumber: string;
  /** Local date and time for a datetime-local input, or empty for no bound. */
  availableStart: string;
  availableEnd: string;
  relatedProductIds: number[];
}

const MAX_RELATED = 12;

/** UTC ISO string to the value of a datetime-local input (local time), and back. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

type StatusFilter = 'all' | 'lowStock' | ProductStatus;

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
              <option value="lowStock">Low stock</option>
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
              <thead><tr><th></th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (p of products; track p.id) {
                  <tr>
                    <td class="thumb-cell">
                      @if (pictureUrl(p.mainPictureId); as url) { <img class="thumb" [src]="url" alt="" loading="lazy" /> }
                      @else { <span class="thumb empty" aria-hidden="true"></span> }
                    </td>
                    <td>
                      <strong>{{ p.name }}</strong>
                      @if (p.sku) { <span class="muted sku">SKU {{ p.sku }}</span> }
                      @if (scheduleNote(p); as note) { <div class="muted">{{ note }}</div> }
                      @if (p.status === 'hiddenByAdmin') {
                        <div class="hidden-note">
                          Hidden by an administrator: {{ p.hiddenReason }}
                          @if (p.reviewRequestedOnUtc) { <br /><span class="muted">Review requested.</span> }
                        </div>
                      }
                    </td>
                    <td>{{ money(p.price) }}@if (p.oldPrice > 0) { <br /><span class="muted">was {{ money(p.oldPrice) }}</span> }</td>
                    <td>{{ p.trackInventory ? p.stockQuantity : '∞' }}@if (p.isLowStock) { <br /><span class="badge badge-pending">Low stock</span> }</td>
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
                        <a class="btn btn-secondary btn-small" [routerLink]="['/vendor/products', p.id, 'details']">Details</a>
                        <button type="button" class="btn btn-secondary btn-small" (click)="copy(p)" [disabled]="busy">Copy</button>
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
              <span class="hint">Basic HTML is kept: p, br, strong, em, u, s, h2–h4, ul, ol, li, blockquote and links (http, https, mailto). Anything else is removed when you save.</span>
              @if (fieldError('fullDescription')) { <span class="field-error">{{ fieldError('fullDescription') }}</span> }
            </label>
            <div class="form-row">
              <label>Price ({{ currency.primary().code }}) *
                <input type="number" name="price" [(ngModel)]="form.price" min="0" [step]="currency.step()" />
                @if (fieldError('price')) { <span class="field-error">{{ fieldError('price') }}</span> }
              </label>
              <label>Compare at price ({{ currency.primary().code }})
                <input type="number" name="oldPrice" [(ngModel)]="form.oldPrice" min="0" [step]="currency.step()" />
                <span class="hint">Must be higher than the price. Leave 0 for none.</span>
                @if (fieldError('oldPrice')) { <span class="field-error">{{ fieldError('oldPrice') }}</span> }
              </label>
              <label>Stock
                <input type="number" name="stockQuantity" [(ngModel)]="form.stockQuantity" min="0" [disabled]="hasVariants || !!editingId" />
                @if (editingId) { <span class="hint">Change stock in Details, Inventory, so every change is recorded.@if (hasVariants) { It is the sum of the variant stocks. } </span> }
                @if (fieldError('stockQuantity')) { <span class="field-error">{{ fieldError('stockQuantity') }}</span> }
              </label>
            </div>

            <div class="form-row">
              <label>SKU
                <input type="text" name="sku" [(ngModel)]="form.sku" maxlength="100" />
                <span class="hint">Unique inside your shop.</span>
                @if (fieldError('sku')) { <span class="field-error">{{ fieldError('sku') }}</span> }
              </label>
              <label>GTIN
                <input type="text" name="gtin" [(ngModel)]="form.gtin" maxlength="14" inputmode="numeric" />
                <span class="hint">8, 12, 13 or 14 digits.</span>
                @if (fieldError('gtin')) { <span class="field-error">{{ fieldError('gtin') }}</span> }
              </label>
              <label>Manufacturer part number
                <input type="text" name="manufacturerPartNumber" [(ngModel)]="form.manufacturerPartNumber" maxlength="100" />
                @if (fieldError('manufacturerPartNumber')) { <span class="field-error">{{ fieldError('manufacturerPartNumber') }}</span> }
              </label>
            </div>
            <div class="form-row">
              <label>On sale from
                <input type="datetime-local" name="availableStart" [(ngModel)]="form.availableStart" />
                <span class="hint">Optional. Empty means as soon as it is published.</span>
              </label>
              <label>On sale until
                <input type="datetime-local" name="availableEnd" [(ngModel)]="form.availableEnd" />
                <span class="hint">Optional. Empty means no end.</span>
                @if (fieldError('availableEndUtc')) { <span class="field-error">{{ fieldError('availableEndUtc') }}</span> }
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

            <fieldset class="pictures">
              <legend>Pictures <span class="hint">(up to {{ maxPictures }}; the first one is the main picture; one is needed to publish)</span></legend>
              @if (form.pictureIds.length === 0) { <span class="muted">No pictures yet.</span> }
              <div class="picture-grid">
                @for (id of form.pictureIds; track id; let i = $index; let last = $last) {
                  <figure class="picture">
                    <img [src]="pictureUrl(id)" [alt]="'Picture ' + (i + 1)" />
                    @if (i === 0) { <figcaption class="main-tag">Main</figcaption> }
                    <div class="picture-actions">
                      <button type="button" class="btn btn-secondary btn-small" (click)="movePicture(i, -1)" [disabled]="i === 0 || uploading" [attr.aria-label]="'Move picture ' + (i + 1) + ' earlier'">←</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="movePicture(i, 1)" [disabled]="last || uploading" [attr.aria-label]="'Move picture ' + (i + 1) + ' later'">→</button>
                      <button type="button" class="btn btn-danger btn-small" (click)="removePicture(i)" [disabled]="uploading" [attr.aria-label]="'Remove picture ' + (i + 1)">Remove</button>
                    </div>
                  </figure>
                }
              </div>
              <label class="pick" [class.disabled]="uploading || form.pictureIds.length >= maxPictures">
                <input type="file" [accept]="accept" multiple (change)="onPictureFiles($event)" [disabled]="uploading || form.pictureIds.length >= maxPictures" />
                {{ uploading ? 'Uploading…' : 'Add pictures' }}
              </label>
              <span class="hint">JPEG, PNG, GIF or WebP, up to 5 MB each. Pictures are saved with the product.</span>
              @if (pictureError) { <span class="field-error" role="alert">{{ pictureError }}</span> }
              @if (fieldError('pictureIds')) { <span class="field-error">{{ fieldError('pictureIds') }}</span> }
            </fieldset>

            <fieldset class="pick-list">
              <legend>Related products <span class="hint">(up to {{ maxRelated }}; shown on the product page in this order)</span></legend>
              @if (!editingId) {
                <span class="muted">Save the product first, then edit it to add related products.</span>
              } @else if (relatedCandidates.length === 0) {
                <span class="muted">Your shop has no other products.</span>
              } @else {
                @for (c of relatedCandidates; track c.id) {
                  <label class="check-label">
                    <input type="checkbox" [checked]="form.relatedProductIds.includes(c.id)" (change)="toggleRelated(c.id)"
                      [disabled]="!form.relatedProductIds.includes(c.id) && form.relatedProductIds.length >= maxRelated" [name]="'rel' + c.id" />
                    {{ c.name }}
                    @if (form.relatedProductIds.includes(c.id)) {
                      <span class="order-buttons">
                        <button type="button" class="btn btn-secondary btn-small" (click)="moveRelated(c.id, -1)" [disabled]="form.relatedProductIds[0] === c.id" [attr.aria-label]="'Move ' + c.name + ' earlier'">←</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="moveRelated(c.id, 1)" [disabled]="form.relatedProductIds[form.relatedProductIds.length - 1] === c.id" [attr.aria-label]="'Move ' + c.name + ' later'">→</button>
                      </span>
                    }
                  </label>
                }
              }
              @if (fieldError('relatedProductIds')) { <span class="field-error">{{ fieldError('relatedProductIds') }}</span> }
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
    .thumb-cell { width: 56px; }
    .sku { display: block; font-size: .75rem; }
    .order-buttons { margin-left: .5rem; display: inline-flex; gap: .25rem; }
    .thumb { width: 48px; height: 48px; object-fit: cover; display: block; border: 1px solid var(--line); background: #e4e8df; }
    .pictures { border: 1px solid var(--line); border-radius: 6px; padding: .6rem .9rem; display: grid; gap: .6rem; justify-items: start; }
    .pictures legend { font-size: .8rem; padding: 0 .3rem; }
    .picture-grid { display: flex; flex-wrap: wrap; gap: .75rem; }
    .picture { margin: 0; display: grid; gap: .35rem; width: 120px; }
    .picture img { width: 120px; height: 120px; object-fit: cover; border: 1px solid var(--line); }
    .main-tag { font: .65rem var(--mono-font); text-transform: uppercase; color: var(--green); }
    .picture-actions { display: flex; gap: .25rem; flex-wrap: wrap; }
    .pick { border: 1px solid var(--green); color: var(--green); padding: .35rem .8rem; font-size: .8rem; font-weight: 600; cursor: pointer; }
    .pick.disabled { opacity: .5; cursor: not-allowed; }
    .pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .pick:focus-within { outline: 2px solid var(--green); outline-offset: 2px; }
  `]
})
export class VendorProductsPage implements OnInit {
  private readonly api = inject(VendorProductApiService);
  private readonly catalog = inject(CatalogApiService);
  private readonly auth = inject(AuthFacade);
  private readonly media = inject(MediaApiService);
  readonly currency = inject(CurrencyService);

  readonly maxPictures = MAX_PICTURES;
  readonly maxRelated = MAX_RELATED;
  /** True when the edited product has variants; its stock then comes from them. */
  hasVariants = false;
  /** Other products of the shop that can be picked as related; loaded when a product is edited. */
  relatedCandidates: VendorProduct[] = [];
  private originalRelatedIds: number[] = [];
  readonly accept = MEDIA_ACCEPT;
  uploading = false;
  pictureError = '';
  private originalPictureIds: number[] = [];
  /** Pictures uploaded in this form session, so a removed one can be deleted again. */
  private readonly sessionUploads = new Set<number>();

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
    this.originalPictureIds = [];
    this.originalRelatedIds = [];
    this.relatedCandidates = [];
    this.hasVariants = false;
    this.sessionUploads.clear();
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
          manufacturerIds: [...(full.manufacturerIds ?? [])],
          pictureIds: [...(full.pictureIds ?? [])],
          sku: full.sku ?? '',
          gtin: full.gtin ?? '',
          manufacturerPartNumber: full.manufacturerPartNumber ?? '',
          availableStart: toLocalInput(full.availableStartUtc),
          availableEnd: toLocalInput(full.availableEndUtc),
          relatedProductIds: [...(full.relatedProductIds ?? [])]
        };
        this.originalPictureIds = [...this.form.pictureIds];
        this.originalRelatedIds = [...this.form.relatedProductIds];
        this.sessionUploads.clear();
        this.loadRelatedCandidates(full.id);
        this.hasVariants = false;
        this.api.getVariants(this.vendorId!, full.id).subscribe({ next: v => { this.hasVariants = v.combinations.length > 0; }, error: () => undefined });
        this.formOpen = true;
      },
      error: err => { this.actionError = vendorErrorMessage(err, 'Unable to load the product.'); }
    });
  }

  closeForm() { this.formOpen = false; this.editingId = null; this.pictureError = ''; this.clearErrors(); }

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
      manufacturerIds: this.form.manufacturerIds,
      sku: this.form.sku.trim() || null,
      gtin: this.form.gtin.trim() || null,
      manufacturerPartNumber: this.form.manufacturerPartNumber.trim() || null,
      availableStartUtc: fromLocalInput(this.form.availableStart),
      availableEndUtc: fromLocalInput(this.form.availableEnd)
    };
    const request = this.editingId
      ? this.api.update(this.vendorId, this.editingId, body)
      : this.api.create(this.vendorId, body);
    request.subscribe({
      next: saved => this.savePictures(saved),
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.formError = Object.keys(this.fieldErrors).length ? '' : this.writeError(err, 'Unable to save the product.');
      }
    });
  }

  /** Pictures are a separate call after the product itself is saved; skipped when nothing changed. */
  private savePictures(saved: VendorProduct) {
    const unchanged = this.form.pictureIds.length === this.originalPictureIds.length
      && this.form.pictureIds.every((id, i) => id === this.originalPictureIds[i]);
    if (!this.vendorId || unchanged) { this.saveRelated(saved); return; }

    this.api.setPictures(this.vendorId, saved.id, this.form.pictureIds).subscribe({
      next: () => this.saveRelated(saved),
      error: err => {
        // The product text is already saved; keep editing that product so only the pictures need fixing.
        this.busy = false;
        this.editingId = saved.id;
        this.fieldErrors = err?.fieldErrors ?? {};
        const detail = Object.keys(this.fieldErrors).length ? '' : this.writeError(err, 'Unable to save the pictures.');
        this.formError = `“${saved.name}” was saved, but its pictures were not. ${detail}`.trim();
        this.fetch();
      }
    });
  }

  /** Related products are another separate call; only for a product that already exists, and skipped when unchanged. */
  private saveRelated(saved: VendorProduct) {
    const unchanged = this.form.relatedProductIds.length === this.originalRelatedIds.length
      && this.form.relatedProductIds.every((id, i) => id === this.originalRelatedIds[i]);
    if (!this.vendorId || !this.editingId || unchanged) { this.finishSave(saved); return; }

    this.api.setRelated(this.vendorId, saved.id, this.form.relatedProductIds).subscribe({
      next: () => this.finishSave(saved),
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        const detail = Object.keys(this.fieldErrors).length ? '' : this.writeError(err, 'Unable to save the related products.');
        this.formError = `“${saved.name}” was saved, but its related products were not. ${detail}`.trim();
        this.fetch();
      }
    });
  }

  private finishSave(saved: VendorProduct) {
    this.busy = false;
    this.closeForm();
    this.notice = `“${saved.name}” saved.`;
    this.fetch();
  }

  pictureUrl(id: number | null | undefined) { return this.media.url(id); }

  onPictureFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || !this.vendorId) return;

    this.pictureError = '';
    const room = MAX_PICTURES - this.form.pictureIds.length;
    if (files.length > room) this.pictureError = `Only ${room} more picture(s) can be added.`;
    const accepted = files.slice(0, Math.max(room, 0)).filter(file => {
      if (file.size > MEDIA_MAX_BYTES) { this.pictureError = `“${file.name}” is larger than 5 MB.`; return false; }
      if (!MEDIA_ACCEPT.split(',').includes(file.type)) { this.pictureError = `“${file.name}” is not a JPEG, PNG, GIF or WebP image.`; return false; }
      return true;
    });
    this.uploadNext(accepted);
  }

  private uploadNext(files: File[]) {
    const [file, ...rest] = files;
    if (!file || !this.vendorId) { this.uploading = false; return; }
    this.uploading = true;
    this.media.upload(file, 'product', this.vendorId).subscribe({
      next: asset => {
        this.form.pictureIds = [...this.form.pictureIds, asset.id];
        this.sessionUploads.add(asset.id);
        this.uploadNext(rest);
      },
      error: err => {
        this.uploading = false;
        this.pictureError = err?.fieldErrors?.['file']?.[0]
          ?? (err?.status === 0 ? 'Network error. Try again.' : err?.status === 403 ? 'You cannot upload pictures right now.' : 'Upload failed.');
      }
    });
  }

  movePicture(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.form.pictureIds.length) return;
    const ids = [...this.form.pictureIds];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.form.pictureIds = ids;
  }

  removePicture(index: number) {
    const ids = [...this.form.pictureIds];
    const [id] = ids.splice(index, 1);
    this.form.pictureIds = ids;
    // An image uploaded in this session and never saved is deleted again; the API refuses (409) if it is attached.
    if (this.sessionUploads.delete(id)) this.media.delete(id).subscribe({ error: () => undefined });
  }

  copy(product: VendorProduct) {
    if (!this.vendorId) return;
    this.busy = true;
    this.clearErrors();
    this.api.copy(this.vendorId, product.id).subscribe({
      next: created => {
        this.busy = false;
        this.notice = `“${product.name}” copied as “${created.name}”. Add pictures and a SKU, then publish it.`;
        this.fetch();
      },
      error: err => { this.busy = false; this.actionError = this.writeError(err, 'Unable to copy the product.'); }
    });
  }

  toggleRelated(id: number) {
    const ids = this.form.relatedProductIds;
    this.form.relatedProductIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  }

  moveRelated(id: number, delta: number) {
    const ids = [...this.form.relatedProductIds];
    const index = ids.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.form.relatedProductIds = ids;
  }

  /** Tells the shop why a live product may not be visible: its sale window has not started or has ended. */
  scheduleNote(product: VendorProduct): string {
    const now = Date.now();
    if (product.availableStartUtc && new Date(product.availableStartUtc).getTime() > now) {
      return `Scheduled: on sale from ${new Date(product.availableStartUtc).toLocaleString()}`;
    }
    if (product.availableEndUtc && new Date(product.availableEndUtc).getTime() <= now) {
      return `Sale window ended ${new Date(product.availableEndUtc).toLocaleString()}`;
    }
    return '';
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

  money(value: number) { return this.currency.formatPrimary(value); }

  private fetch() {
    if (!this.vendorId) return;
    this.loading = true;
    this.api.list(this.vendorId, {
      page: this.page,
      search: this.search.trim() || undefined,
      status: this.status === 'all' || this.status === 'lowStock' ? undefined : this.status,
      lowStock: this.status === 'lowStock' ? true : undefined
    }).subscribe({
      next: res => { this.products = res.items; this.totalPages = Math.max(res.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load products.'); }
    });
  }

  private loadRelatedCandidates(excludeId: number) {
    if (!this.vendorId) return;
    this.api.list(this.vendorId, { pageSize: 100 }).subscribe({
      next: res => { this.relatedCandidates = res.items.filter(p => p.id !== excludeId); },
      error: () => { this.relatedCandidates = []; }
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
    return { name: '', shortDescription: '', fullDescription: '', price: 0, oldPrice: 0, stockQuantity: 0, categoryIds: [], manufacturerIds: [], pictureIds: [], sku: '', gtin: '', manufacturerPartNumber: '', availableStart: '', availableEnd: '', relatedProductIds: [] };
  }
}
