import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogApiService, SaveCategoryRequest, SaveManufacturerRequest, SaveProductRequest } from '../../core/catalog/catalog-api.service';
import {
  AdminCategoryResponse, AdminManufacturerResponse,
  AdminProductDetailResponse, AdminProductResponse
} from '../../core/catalog/catalog.models';

type Tab = 'categories' | 'products' | 'manufacturers';

interface CategoryForm {
  name: string;
  description: string;
  parentCategoryId: number;
  showOnHomepage: boolean;
  published: boolean;
  displayOrder: number;
}

interface ProductForm {
  name: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  published: boolean;
  showOnHomepage: boolean;
  displayOrder: number;
  categoryIds: string;
  manufacturerIds: string;
}

interface ManufacturerForm {
  name: string;
  description: string;
  published: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="admin-intro" aria-labelledby="catalog-title">
      <div>
        <div class="eyebrow">Admin / Catalog</div>
        <h1 id="catalog-title">Manage the product catalog.</h1>
        <p>Create and publish categories, products and manufacturers. Unpublished items are hidden from the storefront but remain editable here.</p>
      </div>
    </section>

    <div class="tab-bar" role="tablist">
      <button role="tab" [class.active]="tab === 'categories'" (click)="switchTab('categories')">Categories</button>
      <button role="tab" [class.active]="tab === 'products'" (click)="switchTab('products')">Products</button>
      <button role="tab" [class.active]="tab === 'manufacturers'" (click)="switchTab('manufacturers')">Manufacturers</button>
    </div>

    <!-- =========== CATEGORIES =========== -->
    @if (tab === 'categories') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>Categories</h2>
          <button type="button" class="new-btn" (click)="openCategoryForm()">+ New category</button>
        </div>

        @if (catFormOpen) {
          <form class="inline-form" (ngSubmit)="submitCategory()" [attr.aria-label]="(editingCategoryId ? 'Edit' : 'Create') + ' category'">
            <div class="form-title">{{ editingCategoryId ? 'Edit category' : 'New category' }}</div>
            @if (catError) { <p class="form-error" role="alert">{{ catError }}</p> }
            <label>Name <input type="text" [(ngModel)]="catForm.name" name="name" required /></label>
            <label>Description <textarea [(ngModel)]="catForm.description" name="description" rows="2"></textarea></label>
            <label>Parent category ID <input type="number" [(ngModel)]="catForm.parentCategoryId" name="parentCategoryId" min="0" /></label>
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="catForm.published" name="published" /> Published</label>
              <label class="check-label"><input type="checkbox" [(ngModel)]="catForm.showOnHomepage" name="showOnHomepage" /> Show on homepage</label>
              <label>Display order <input type="number" [(ngModel)]="catForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="catSaving">{{ catSaving ? 'Saving...' : 'Save' }}</button>
              <button type="button" class="cancel-btn" (click)="closeCategoryForm()">Cancel</button>
            </div>
          </form>
        }

        @if (catLoading) { <p class="state">Loading categories...</p> }
        @if (catLoadError) { <p class="state state-error" role="alert">{{ catLoadError }}</p> }
        @if (!catLoading && categories.length === 0 && !catLoadError) { <p class="state">No categories yet.</p> }

        <div class="item-list">
          @for (cat of categories; track cat.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ cat.name }}</span>
                @if (!cat.published) { <span class="badge-unpub">Unpublished</span> }
                @if (cat.parentCategoryId) { <span class="item-meta">parent #{{ cat.parentCategoryId }}</span> }
              </div>
              <div class="item-actions">
                <button type="button" (click)="editCategory(cat)">Edit</button>
                <button type="button" class="del-btn" (click)="deleteCategory(cat.id)">Delete</button>
              </div>
            </div>
          }
        </div>

        @if (catTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="catPage <= 1" (click)="loadCategories(catPage - 1)">← Prev</button>
            <span>{{ catPage }} / {{ catTotalPages }}</span>
            <button type="button" [disabled]="catPage >= catTotalPages" (click)="loadCategories(catPage + 1)">Next →</button>
          </div>
        }
      </div>
    }

    <!-- =========== PRODUCTS =========== -->
    @if (tab === 'products') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>Products</h2>
          <div class="panel-header-right">
            <input type="text" class="search-input" placeholder="Search products..." [(ngModel)]="prodSearch" (keydown.enter)="loadProducts(1)" />
            <button type="button" (click)="loadProducts(1)">Search</button>
            <button type="button" class="new-btn" (click)="openProductForm()">+ New product</button>
          </div>
        </div>

        @if (prodFormOpen) {
          <form class="inline-form" (ngSubmit)="submitProduct()" [attr.aria-label]="(editingProductId ? 'Edit' : 'Create') + ' product'">
            <div class="form-title">{{ editingProductId ? 'Edit product' : 'New product' }}</div>
            @if (prodError) { <p class="form-error" role="alert">{{ prodError }}</p> }
            <label>Name <input type="text" [(ngModel)]="prodForm.name" name="name" required /></label>
            <label>Short description <textarea [(ngModel)]="prodForm.shortDescription" name="shortDescription" rows="2"></textarea></label>
            <label>Full description <textarea [(ngModel)]="prodForm.fullDescription" name="fullDescription" rows="4"></textarea></label>
            <div class="form-row">
              <label>Price <input type="number" [(ngModel)]="prodForm.price" name="price" min="0" step="0.01" /></label>
              <label>Compare at price <input type="number" [(ngModel)]="prodForm.oldPrice" name="oldPrice" min="0" step="0.01" /></label>
              <label>Stock <input type="number" [(ngModel)]="prodForm.stockQuantity" name="stockQuantity" min="0" /></label>
            </div>
            <label>Category IDs <small>(comma-separated)</small> <input type="text" [(ngModel)]="prodForm.categoryIds" name="categoryIds" placeholder="1,2,3" /></label>
            <label>Manufacturer IDs <small>(comma-separated)</small> <input type="text" [(ngModel)]="prodForm.manufacturerIds" name="manufacturerIds" placeholder="1,2" /></label>
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="prodForm.published" name="published" /> Published</label>
              <label class="check-label"><input type="checkbox" [(ngModel)]="prodForm.showOnHomepage" name="showOnHomepage" /> Show on homepage</label>
              <label>Display order <input type="number" [(ngModel)]="prodForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="prodSaving">{{ prodSaving ? 'Saving...' : 'Save' }}</button>
              <button type="button" class="cancel-btn" (click)="closeProductForm()">Cancel</button>
            </div>
          </form>
        }

        @if (prodLoading) { <p class="state">Loading products...</p> }
        @if (prodLoadError) { <p class="state state-error" role="alert">{{ prodLoadError }}</p> }
        @if (!prodLoading && products.length === 0 && !prodLoadError) { <p class="state">No products yet.</p> }

        <div class="item-list">
          @for (prod of products; track prod.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ prod.name }}</span>
                @if (!prod.published) { <span class="badge-unpub">Unpublished</span> }
                <span class="item-meta">{{ formatPrice(prod.price) }}</span>
                <span class="item-meta">stock: {{ prod.stockQuantity }}</span>
              </div>
              <div class="item-actions">
                <button type="button" (click)="editProduct(prod)">Edit</button>
                <button type="button" class="del-btn" (click)="deleteProduct(prod.id)">Delete</button>
              </div>
            </div>
          }
        </div>

        @if (prodTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="prodPage <= 1" (click)="loadProducts(prodPage - 1)">← Prev</button>
            <span>{{ prodPage }} / {{ prodTotalPages }}</span>
            <button type="button" [disabled]="prodPage >= prodTotalPages" (click)="loadProducts(prodPage + 1)">Next →</button>
          </div>
        }
      </div>
    }

    <!-- =========== MANUFACTURERS =========== -->
    @if (tab === 'manufacturers') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>Manufacturers</h2>
          <button type="button" class="new-btn" (click)="openManufacturerForm()">+ New manufacturer</button>
        </div>

        @if (mfrFormOpen) {
          <form class="inline-form" (ngSubmit)="submitManufacturer()" [attr.aria-label]="(editingManufacturerId ? 'Edit' : 'Create') + ' manufacturer'">
            <div class="form-title">{{ editingManufacturerId ? 'Edit manufacturer' : 'New manufacturer' }}</div>
            @if (mfrError) { <p class="form-error" role="alert">{{ mfrError }}</p> }
            <label>Name <input type="text" [(ngModel)]="mfrForm.name" name="name" required /></label>
            <label>Description <textarea [(ngModel)]="mfrForm.description" name="description" rows="2"></textarea></label>
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="mfrForm.published" name="published" /> Published</label>
              <label>Display order <input type="number" [(ngModel)]="mfrForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="mfrSaving">{{ mfrSaving ? 'Saving...' : 'Save' }}</button>
              <button type="button" class="cancel-btn" (click)="closeManufacturerForm()">Cancel</button>
            </div>
          </form>
        }

        @if (mfrLoading) { <p class="state">Loading manufacturers...</p> }
        @if (mfrLoadError) { <p class="state state-error" role="alert">{{ mfrLoadError }}</p> }
        @if (!mfrLoading && manufacturers.length === 0 && !mfrLoadError) { <p class="state">No manufacturers yet.</p> }

        <div class="item-list">
          @for (mfr of manufacturers; track mfr.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ mfr.name }}</span>
                @if (!mfr.published) { <span class="badge-unpub">Unpublished</span> }
              </div>
              <div class="item-actions">
                <button type="button" (click)="editManufacturer(mfr)">Edit</button>
                <button type="button" class="del-btn" (click)="deleteManufacturer(mfr.id)">Delete</button>
              </div>
            </div>
          }
        </div>

        @if (mfrTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="mfrPage <= 1" (click)="loadManufacturers(mfrPage - 1)">← Prev</button>
            <span>{{ mfrPage }} / {{ mfrTotalPages }}</span>
            <button type="button" [disabled]="mfrPage >= mfrTotalPages" (click)="loadManufacturers(mfrPage + 1)">Next →</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .admin-intro { padding: clamp(2rem, 8vw, 6rem) 0 2.5rem; animation: rise-in 600ms ease both; }
    .eyebrow { color: var(--green); font: 700 0.75rem/1 var(--mono-font); letter-spacing: 0.13em; text-transform: uppercase; margin-bottom: .5rem; }
    h1 { max-width: 700px; margin: 1.2rem 0 .5rem; font: 700 clamp(2.5rem, 6vw, 5rem)/0.94 var(--display-font); }
    p { max-width: 560px; color: var(--muted); font-size: 1rem; line-height: 1.7; margin: 0; }
    .tab-bar { display: flex; gap: 0; border-bottom: 1px solid var(--line-strong); margin-bottom: 0; }
    .tab-bar button { border: none; border-bottom: 2px solid transparent; padding: .8rem 1.4rem; background: transparent; color: var(--muted); font: 600 .8rem var(--mono-font); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; margin-bottom: -1px; }
    .tab-bar button.active { color: var(--ink); border-bottom-color: var(--ink); }
    .panel { padding-top: 1.5rem; max-width: 960px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .panel-header-right { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
    h2 { margin: 0; font: 700 2rem/1 var(--display-font); }
    .new-btn { border: 1px solid var(--green); padding: .55rem .9rem; background: transparent; color: var(--green); font: 600 .8rem var(--mono-font); letter-spacing: .06em; cursor: pointer; }
    .search-input { border: 1px solid var(--line-strong); padding: .55rem .7rem; background: var(--paper); color: var(--ink); font: inherit; font-size: .88rem; min-width: 200px; }
    .inline-form { border: 1px solid var(--line); padding: 1.25rem; background: rgba(255,255,255,.6); margin-bottom: 1.5rem; display: grid; gap: .9rem; }
    .form-title { font: 700 .8rem var(--mono-font); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
    .inline-form label { display: grid; gap: .35rem; color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; }
    .inline-form label small { text-transform: none; font-size: .7rem; }
    input[type=text], input[type=number], textarea { border: 1px solid var(--line-strong); padding: .65rem .7rem; background: var(--paper); color: var(--ink); font: inherit; font-size: .9rem; width: 100%; box-sizing: border-box; }
    textarea { resize: vertical; }
    .form-row { display: flex; flex-wrap: wrap; gap: .8rem; align-items: end; }
    .check-label { display: flex !important; flex-direction: row; align-items: center; gap: .5rem; text-transform: none; }
    .check-label input { width: auto; }
    .form-actions { display: flex; gap: .7rem; }
    button { border: 1px solid var(--ink); padding: .65rem 1rem; background: var(--ink); color: var(--paper); font: 600 .82rem inherit; cursor: pointer; }
    button:disabled { opacity: .4; cursor: not-allowed; }
    .cancel-btn { background: transparent; color: var(--ink); }
    .del-btn { background: transparent; color: #8d3128; border-color: #c9a09c; font-size: .78rem; padding: .4rem .7rem; }
    .del-btn:hover { background: #8d3128; color: var(--paper); }
    .form-error { color: #8d3128; font-size: .88rem; margin: 0; }
    .item-list { border-top: 1px solid var(--line-strong); }
    .item-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .75rem .25rem; border-bottom: 1px solid var(--line); }
    .item-info { display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; min-width: 0; }
    .item-name { font-weight: 600; }
    .item-meta { color: var(--muted); font: .72rem var(--mono-font); }
    .badge-unpub { color: var(--muted); font: .65rem var(--mono-font); border: 1px solid var(--line-strong); padding: .2rem .45rem; }
    .item-actions { display: flex; gap: .5rem; flex-shrink: 0; }
    .item-actions button { font-size: .78rem; padding: .4rem .75rem; }
    .state { color: var(--muted); padding: 1.5rem 0; }
    .state-error { color: #8d3128; }
    .pagination { display: flex; gap: 1rem; align-items: center; padding: 1.25rem 0; font: .75rem var(--mono-font); color: var(--muted); }
    .pagination button { font-size: .75rem; padding: .4rem .75rem; }
    @media (max-width: 600px) { .panel-header { flex-direction: column; align-items: flex-start; } .item-row { flex-direction: column; align-items: flex-start; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminCatalogPage {
  private readonly api = inject(CatalogApiService);

  tab: Tab = 'categories';

  // ----- Categories -----
  categories: AdminCategoryResponse[] = [];
  catLoading = false;
  catLoadError: string | null = null;
  catPage = 1;
  catTotalPages = 1;
  catFormOpen = false;
  catSaving = false;
  catError: string | null = null;
  editingCategoryId: number | null = null;
  catForm: CategoryForm = this.emptyCatForm();

  // ----- Products -----
  products: AdminProductResponse[] = [];
  prodLoading = false;
  prodLoadError: string | null = null;
  prodPage = 1;
  prodTotalPages = 1;
  prodSearch = '';
  prodFormOpen = false;
  prodSaving = false;
  prodError: string | null = null;
  editingProductId: number | null = null;
  prodForm: ProductForm = this.emptyProdForm();

  // ----- Manufacturers -----
  manufacturers: AdminManufacturerResponse[] = [];
  mfrLoading = false;
  mfrLoadError: string | null = null;
  mfrPage = 1;
  mfrTotalPages = 1;
  mfrFormOpen = false;
  mfrSaving = false;
  mfrError: string | null = null;
  editingManufacturerId: number | null = null;
  mfrForm: ManufacturerForm = this.emptyMfrForm();

  constructor() {
    this.loadCategories(1);
  }

  switchTab(t: Tab) {
    this.tab = t;
    if (t === 'categories' && this.categories.length === 0) this.loadCategories(1);
    if (t === 'products' && this.products.length === 0) this.loadProducts(1);
    if (t === 'manufacturers' && this.manufacturers.length === 0) this.loadManufacturers(1);
  }

  // ---- Category CRUD ----

  loadCategories(page: number) {
    this.catLoading = true;
    this.catLoadError = null;
    this.api.adminGetCategories(page).subscribe({
      next: r => { this.categories = r.items; this.catPage = r.page; this.catTotalPages = r.totalPages; this.catLoading = false; },
      error: () => { this.catLoadError = 'Unable to load categories.'; this.catLoading = false; }
    });
  }

  openCategoryForm() {
    this.editingCategoryId = null;
    this.catForm = this.emptyCatForm();
    this.catError = null;
    this.catFormOpen = true;
  }

  closeCategoryForm() {
    this.catFormOpen = false;
    this.catError = null;
  }

  editCategory(cat: AdminCategoryResponse) {
    this.editingCategoryId = cat.id;
    this.catForm = {
      name: cat.name, description: cat.description ?? '',
      parentCategoryId: cat.parentCategoryId,
      showOnHomepage: cat.showOnHomepage, published: cat.published, displayOrder: cat.displayOrder
    };
    this.catError = null;
    this.catFormOpen = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submitCategory() {
    this.catSaving = true;
    this.catError = null;
    const req: SaveCategoryRequest = {
      name: this.catForm.name,
      description: this.catForm.description || null,
      parentCategoryId: this.catForm.parentCategoryId,
      showOnHomepage: this.catForm.showOnHomepage,
      published: this.catForm.published,
      displayOrder: this.catForm.displayOrder
    };
    const obs = this.editingCategoryId
      ? this.api.adminUpdateCategory(this.editingCategoryId, req)
      : this.api.adminCreateCategory(req);
    obs.subscribe({
      next: () => { this.catSaving = false; this.closeCategoryForm(); this.loadCategories(this.catPage); },
      error: err => { this.catError = extractError(err, 'Save failed.'); this.catSaving = false; }
    });
  }

  deleteCategory(id: number) {
    if (!confirm('Delete this category?')) return;
    this.api.adminDeleteCategory(id).subscribe({
      next: () => this.loadCategories(this.catPage),
      error: () => alert('Unable to delete category.')
    });
  }

  // ---- Product CRUD ----

  loadProducts(page: number) {
    this.prodLoading = true;
    this.prodLoadError = null;
    this.api.adminGetProducts(page, 50, this.prodSearch || null).subscribe({
      next: r => { this.products = r.items; this.prodPage = r.page; this.prodTotalPages = r.totalPages; this.prodLoading = false; },
      error: () => { this.prodLoadError = 'Unable to load products.'; this.prodLoading = false; }
    });
  }

  openProductForm() {
    this.editingProductId = null;
    this.prodForm = this.emptyProdForm();
    this.prodError = null;
    this.prodFormOpen = true;
  }

  closeProductForm() {
    this.prodFormOpen = false;
    this.prodError = null;
  }

  editProduct(prod: AdminProductResponse) {
    this.prodSaving = true;
    this.api.adminGetProduct(prod.id).subscribe({
      next: (detail: AdminProductDetailResponse) => {
        this.editingProductId = prod.id;
        this.prodForm = {
          name: prod.name,
          shortDescription: prod.shortDescription ?? '',
          fullDescription: prod.fullDescription ?? '',
          price: prod.price, oldPrice: prod.oldPrice, stockQuantity: prod.stockQuantity,
          published: prod.published, showOnHomepage: prod.showOnHomepage, displayOrder: prod.displayOrder,
          categoryIds: detail.categoryIds.join(','),
          manufacturerIds: detail.manufacturerIds.join(',')
        };
        this.prodError = null;
        this.prodFormOpen = true;
        this.prodSaving = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => { this.prodSaving = false; alert('Unable to load product.'); }
    });
  }

  submitProduct() {
    this.prodSaving = true;
    this.prodError = null;
    const req: SaveProductRequest = {
      name: this.prodForm.name,
      shortDescription: this.prodForm.shortDescription || null,
      fullDescription: this.prodForm.fullDescription || null,
      price: this.prodForm.price, oldPrice: this.prodForm.oldPrice,
      stockQuantity: this.prodForm.stockQuantity,
      published: this.prodForm.published, showOnHomepage: this.prodForm.showOnHomepage,
      displayOrder: this.prodForm.displayOrder,
      categoryIds: parseIds(this.prodForm.categoryIds),
      manufacturerIds: parseIds(this.prodForm.manufacturerIds)
    };
    const obs = this.editingProductId
      ? this.api.adminUpdateProduct(this.editingProductId, req)
      : this.api.adminCreateProduct(req);
    obs.subscribe({
      next: () => { this.prodSaving = false; this.closeProductForm(); this.loadProducts(this.prodPage); },
      error: err => { this.prodError = extractError(err, 'Save failed.'); this.prodSaving = false; }
    });
  }

  deleteProduct(id: number) {
    if (!confirm('Delete this product?')) return;
    this.api.adminDeleteProduct(id).subscribe({
      next: () => this.loadProducts(this.prodPage),
      error: () => alert('Unable to delete product.')
    });
  }

  // ---- Manufacturer CRUD ----

  loadManufacturers(page: number) {
    this.mfrLoading = true;
    this.mfrLoadError = null;
    this.api.adminGetManufacturers(page).subscribe({
      next: r => { this.manufacturers = r.items; this.mfrPage = r.page; this.mfrTotalPages = r.totalPages; this.mfrLoading = false; },
      error: () => { this.mfrLoadError = 'Unable to load manufacturers.'; this.mfrLoading = false; }
    });
  }

  openManufacturerForm() {
    this.editingManufacturerId = null;
    this.mfrForm = this.emptyMfrForm();
    this.mfrError = null;
    this.mfrFormOpen = true;
  }

  closeManufacturerForm() {
    this.mfrFormOpen = false;
    this.mfrError = null;
  }

  editManufacturer(mfr: AdminManufacturerResponse) {
    this.editingManufacturerId = mfr.id;
    this.mfrForm = {
      name: mfr.name, description: mfr.description ?? '',
      published: mfr.published, displayOrder: mfr.displayOrder
    };
    this.mfrError = null;
    this.mfrFormOpen = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submitManufacturer() {
    this.mfrSaving = true;
    this.mfrError = null;
    const req: SaveManufacturerRequest = {
      name: this.mfrForm.name,
      description: this.mfrForm.description || null,
      published: this.mfrForm.published,
      displayOrder: this.mfrForm.displayOrder
    };
    const obs = this.editingManufacturerId
      ? this.api.adminUpdateManufacturer(this.editingManufacturerId, req)
      : this.api.adminCreateManufacturer(req);
    obs.subscribe({
      next: () => { this.mfrSaving = false; this.closeManufacturerForm(); this.loadManufacturers(this.mfrPage); },
      error: err => { this.mfrError = extractError(err, 'Save failed.'); this.mfrSaving = false; }
    });
  }

  deleteManufacturer(id: number) {
    if (!confirm('Delete this manufacturer?')) return;
    this.api.adminDeleteManufacturer(id).subscribe({
      next: () => this.loadManufacturers(this.mfrPage),
      error: () => alert('Unable to delete manufacturer.')
    });
  }

  formatPrice(price: number): string {
    return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
  }

  private emptyCatForm(): CategoryForm {
    return { name: '', description: '', parentCategoryId: 0, showOnHomepage: false, published: true, displayOrder: 0 };
  }

  private emptyProdForm(): ProductForm {
    return { name: '', shortDescription: '', fullDescription: '', price: 0, oldPrice: 0, stockQuantity: 0, published: true, showOnHomepage: false, displayOrder: 0, categoryIds: '', manufacturerIds: '' };
  }

  private emptyMfrForm(): ManufacturerForm {
    return { name: '', description: '', published: true, displayOrder: 0 };
  }
}

function parseIds(value: string): number[] {
  return value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
}

function extractError(err: { error?: { errors?: Record<string, string[]> } }, fallback: string): string {
  if (err?.error?.errors) {
    return Object.values(err.error.errors).flat().join(' ');
  }
  return fallback;
}
