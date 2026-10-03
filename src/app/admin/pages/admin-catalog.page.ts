import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService, translate } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorResponse } from '../../core/vendors/vendor.models';
import { MediaImageFieldComponent } from '../../shared/components/media-image-field/media-image-field.component';
import { CatalogApiService, SaveCategoryRequest, SaveManufacturerRequest, SaveProductRequest } from '../../core/catalog/catalog-api.service';
import {
  AdminCategoryResponse, AdminCategoryTreeNode, AdminManufacturerResponse,
  AdminProductDetailResponse, AdminProductResponse
} from '../../core/catalog/catalog.models';

type Tab = 'categories' | 'products' | 'manufacturers';

interface CategoryForm {
  name: string;
  description: string;
  parentCategoryId: number;
  pictureId: number;
  showOnHomepage: boolean;
  published: boolean;
  restrictFromVendors: boolean;
  displayOrder: number;
}

interface ParentOption {
  id: number;
  label: string;
}

interface ProductForm {
  /** Shop for a new product; 0 means the platform shop. Not used when editing. */
  vendorId: number;
  name: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  published: boolean;
  showOnHomepage: boolean;
  displayOrder: number;
  categoryIds: number[];
  manufacturerIds: number[];
}

interface ManufacturerForm {
  name: string;
  description: string;
  pictureId: number;
  published: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule, MediaImageFieldComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="admin-intro" aria-labelledby="catalog-title">
      <div>
        <div class="eyebrow">{{ t('admin.catalog.eyebrow') }}</div>
        <h1 id="catalog-title">{{ t('admin.catalog.title') }}</h1>
        <p>{{ t('admin.catalog.lede') }}</p>
      </div>
    </section>

    <div class="tab-bar" role="tablist">
      <button role="tab" [class.active]="tab === 'categories'" (click)="switchTab('categories')">{{ t('admin.catalog.categories') }}</button>
      <button role="tab" [class.active]="tab === 'products'" (click)="switchTab('products')">{{ t('admin.catalog.products') }}</button>
      <button role="tab" [class.active]="tab === 'manufacturers'" (click)="switchTab('manufacturers')">{{ t('admin.catalog.manufacturers') }}</button>
    </div>

    @if (notice) { <p class="form-error notice" role="alert">{{ notice }}</p> }

    <!-- =========== CATEGORIES =========== -->
    @if (tab === 'categories') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>{{ t('admin.catalog.categories') }}</h2>
          <button type="button" class="new-btn" (click)="openCategoryForm()">+ {{ t('admin.catalog.newCategory') }}</button>
        </div>

        @if (catFormOpen) {
          <form class="inline-form" (ngSubmit)="submitCategory()" [attr.aria-label]="editingCategoryId ? t('admin.catalog.editCategory') : t('admin.catalog.newCategory')">
            <div class="form-title">{{ editingCategoryId ? t('admin.catalog.editCategory') : t('admin.catalog.newCategory') }}</div>
            @if (catError) { <p class="form-error" role="alert">{{ catError }}</p> }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="catForm.name" name="name" required /></label>
            <label>{{ t('admin.common.description') }} <textarea [(ngModel)]="catForm.description" name="description" rows="2"></textarea></label>
            <label>{{ t('admin.catalog.parentCategory') }}
              <select [(ngModel)]="catForm.parentCategoryId" name="parentCategoryId">
                <option [ngValue]="0">{{ t('admin.catalog.topLevel') }}</option>
                @for (opt of parentOptions; track opt.id) { <option [ngValue]="opt.id">{{ opt.label }}</option> }
              </select>
            </label>
            <app-media-image-field [label]="t('admin.catalog.categoryImage')" purpose="category" [(pictureId)]="catForm.pictureId" />
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="catForm.published" name="published" /> {{ t('admin.catalog.published') }}</label>
              <label class="check-label"><input type="checkbox" [(ngModel)]="catForm.showOnHomepage" name="showOnHomepage" /> {{ t('admin.catalog.showOnHomepage') }}</label>
              <label class="check-label"><input type="checkbox" [(ngModel)]="catForm.restrictFromVendors" name="restrictFromVendors" /> {{ t('admin.catalog.restrictSellers') }} <small>({{ t('admin.catalog.restrictSellersHint') }})</small></label>
              <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="catForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="catSaving">{{ catSaving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeCategoryForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (catLoading) { <p class="state">{{ t('admin.catalog.loadingCategories') }}</p> }
        @if (catLoadError) { <p class="state state-error" role="alert">{{ catLoadError }}</p> }
        @if (!catLoading && categories.length === 0 && !catLoadError) { <p class="state">{{ t('admin.catalog.noCategories') }}</p> }

        <div class="item-list">
          @for (cat of categories; track cat.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ cat.name }}</span>
                @if (!cat.published) { <span class="badge-unpub">{{ t('admin.catalog.unpublished') }}</span> }
                @if (cat.parentCategoryId) { <span class="item-meta">{{ t('admin.catalog.parent', { id: cat.parentCategoryId }) }}</span> }
              </div>
              <div class="item-actions">
                <button type="button" (click)="editCategory(cat)">{{ t('common.actions.edit') }}</button>
                <button type="button" class="del-btn" (click)="deleteCategory(cat.id)">{{ t('common.actions.delete') }}</button>
              </div>
            </div>
          }
        </div>

        @if (catTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="catPage <= 1" (click)="loadCategories(catPage - 1)">← {{ t('common.pagination.prev') }}</button>
            <span>{{ catPage }} / {{ catTotalPages }}</span>
            <button type="button" [disabled]="catPage >= catTotalPages" (click)="loadCategories(catPage + 1)">{{ t('common.pagination.next') }} →</button>
          </div>
        }
      </div>
    }

    <!-- =========== PRODUCTS =========== -->
    @if (tab === 'products') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>{{ t('admin.catalog.products') }}</h2>
          <div class="panel-header-right">
            <input type="text" class="search-input" [placeholder]="t('admin.catalog.searchProducts')" [(ngModel)]="prodSearch" (keydown.enter)="loadProducts(1)" />
            <select [(ngModel)]="prodFilter" name="prodFilter" (ngModelChange)="loadProducts(1)" [attr.aria-label]="t('admin.catalog.filterProducts')">
              <option value="all">{{ t('admin.catalog.filterAll') }}</option>
              <option value="review">{{ t('admin.catalog.filterReview') }}</option>
              <option value="hiddenByAdmin">{{ t('admin.catalog.status.hiddenByAdmin') }}</option>
              <option value="live">{{ t('admin.catalog.status.live') }}</option>
              <option value="draft">{{ t('admin.catalog.status.draft') }}</option>
              <option value="stopped">{{ t('admin.catalog.status.stopped') }}</option>
            </select>
            <button type="button" (click)="loadProducts(1)">{{ t('common.actions.search') }}</button>
            <button type="button" class="new-btn" (click)="openProductForm()">+ {{ t('admin.catalog.newProduct') }}</button>
          </div>
        </div>

        @if (prodFormOpen) {
          <form class="inline-form" (ngSubmit)="submitProduct()" [attr.aria-label]="editingProductId ? t('admin.catalog.editProduct') : t('admin.catalog.newProduct')">
            <div class="form-title">{{ editingProductId ? t('admin.catalog.editProduct') : t('admin.catalog.newProduct') }}</div>
            @if (prodError) { <p class="form-error" role="alert">{{ prodError }}</p> }
            @if (!editingProductId) {
              <label>{{ t('admin.catalog.shop') }}
                <select [(ngModel)]="prodForm.vendorId" name="vendorId">
                  <option [ngValue]="0">{{ t('admin.catalog.platformShop') }}</option>
                  @for (v of shops; track v.id) { <option [ngValue]="v.id">{{ v.name }}</option> }
                </select>
              </label>
            } @else {
              <div class="transfer">
                <span class="muted">{{ t('admin.catalog.shop') }}: <strong>{{ editingVendorName }}</strong></span>
                <select [(ngModel)]="transferVendorId" name="transferVendorId" [attr.aria-label]="t('admin.catalog.transferTo')">
                  <option [ngValue]="0">{{ t('admin.catalog.transferTo') }}</option>
                  @for (v of shops; track v.id) { @if (v.id !== editingVendorId) { <option [ngValue]="v.id">{{ v.name }}</option> } }
                </select>
                <button type="button" (click)="transferProduct()" [disabled]="!transferVendorId || prodSaving">{{ t('admin.catalog.transfer') }}</button>
              </div>
            }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="prodForm.name" name="name" required /></label>
            <label>{{ t('admin.catalog.shortDescription') }} <textarea [(ngModel)]="prodForm.shortDescription" name="shortDescription" rows="2"></textarea></label>
            <label>{{ t('admin.catalog.fullDescription') }} <textarea [(ngModel)]="prodForm.fullDescription" name="fullDescription" rows="4"></textarea></label>
            <div class="form-row">
              <label>{{ t('admin.catalog.price') }} ({{ currency.primary().code }}) <input type="number" [(ngModel)]="prodForm.price" name="price" min="0" [step]="currency.step()" /></label>
              <label>{{ t('admin.catalog.compareAtPrice') }} ({{ currency.primary().code }}) <input type="number" [(ngModel)]="prodForm.oldPrice" name="oldPrice" min="0" [step]="currency.step()" /></label>
              <label>{{ t('admin.catalog.stock') }} <input type="number" [(ngModel)]="prodForm.stockQuantity" name="stockQuantity" min="0" /></label>
            </div>
            <fieldset class="pick-list">
              <legend>{{ t('admin.catalog.categories') }} <small>({{ t('admin.catalog.upTo10') }})</small></legend>
              @if (categoryOptions.length === 0) { <span class="muted">{{ t('admin.catalog.noCategories') }}</span> }
              @for (opt of categoryOptions; track opt.id) {
                <label class="check-label"><input type="checkbox" [checked]="prodForm.categoryIds.includes(opt.id)" (change)="toggleId(prodForm.categoryIds, opt.id)" [name]="'cat' + opt.id" /> {{ opt.label }}</label>
              }
            </fieldset>
            <fieldset class="pick-list">
              <legend>{{ t('admin.catalog.manufacturers') }} <small>({{ t('admin.catalog.upTo10') }})</small></legend>
              @if (manufacturerOptions.length === 0) { <span class="muted">{{ t('admin.catalog.noManufacturers') }}</span> }
              @for (m of manufacturerOptions; track m.id) {
                <label class="check-label"><input type="checkbox" [checked]="prodForm.manufacturerIds.includes(m.id)" (change)="toggleId(prodForm.manufacturerIds, m.id)" [name]="'mfr' + m.id" /> {{ m.name }}</label>
              }
            </fieldset>
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="prodForm.published" name="published" /> {{ t('admin.catalog.onSale') }} <small>({{ t('admin.catalog.onSaleHint') }})</small></label>
              <label class="check-label"><input type="checkbox" [(ngModel)]="prodForm.showOnHomepage" name="showOnHomepage" /> {{ t('admin.catalog.showOnHomepage') }}</label>
              <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="prodForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="prodSaving">{{ prodSaving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeProductForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (prodLoading) { <p class="state">{{ t('admin.catalog.loadingProducts') }}</p> }
        @if (prodLoadError) { <p class="state state-error" role="alert">{{ prodLoadError }}</p> }
        @if (!prodLoading && products.length === 0 && !prodLoadError) { <p class="state">{{ t('admin.catalog.noProducts') }}</p> }

        <div class="item-list">
          @for (prod of products; track prod.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ prod.name }}</span>
                <span [class]="prod.status === 'hiddenByAdmin' ? 'badge-unpub' : 'item-meta'">{{ statusLabel(prod.status) }}</span>
                @if (prod.reviewRequestedOnUtc) { <span class="badge-unpub">{{ t('admin.catalog.reviewRequested') }}</span> }
                <span class="item-meta">{{ formatPrice(prod.price) }}</span>
                <span class="item-meta">{{ t('admin.catalog.shopValue', { name: prod.vendorName }) }}</span>
                <span class="item-meta">{{ t('admin.catalog.stockValue', { count: prod.stockQuantity }) }}</span>
              </div>
              <div class="item-actions">
                <button type="button" (click)="editProduct(prod)">{{ t('common.actions.edit') }}</button>
                @if (prod.status === 'hiddenByAdmin') {
                  <button type="button" (click)="unhideProduct(prod)">{{ t('admin.catalog.unhide') }}</button>
                } @else {
                  <button type="button" (click)="startHide(prod)">{{ t('admin.catalog.hide') }}</button>
                }
                <button type="button" class="del-btn" (click)="deleteProduct(prod.id)">{{ t('common.actions.delete') }}</button>
              </div>
              @if (prod.status === 'hiddenByAdmin' && prod.hiddenReason) {
                <p class="hidden-reason">{{ t('admin.catalog.hiddenReason', { reason: prod.hiddenReason }) }}</p>
              }
              @if (hidingId === prod.id) {
                <form class="hide-form" (ngSubmit)="confirmHide(prod)">
                  <label>{{ t('admin.catalog.hideReasonLabel') }} *
                    <textarea [(ngModel)]="hideReason" name="hideReason" rows="2" maxlength="2000"></textarea>
                  </label>
                  <div class="form-actions">
                    <button type="submit" [disabled]="!hideReason.trim() || prodSaving">{{ t('admin.catalog.hideProduct') }}</button>
                    <button type="button" class="cancel-btn" (click)="hidingId = null">{{ t('common.actions.cancel') }}</button>
                  </div>
                </form>
              }
            </div>
          }
        </div>

        @if (prodTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="prodPage <= 1" (click)="loadProducts(prodPage - 1)">← {{ t('common.pagination.prev') }}</button>
            <span>{{ prodPage }} / {{ prodTotalPages }}</span>
            <button type="button" [disabled]="prodPage >= prodTotalPages" (click)="loadProducts(prodPage + 1)">{{ t('common.pagination.next') }} →</button>
          </div>
        }
      </div>
    }

    <!-- =========== MANUFACTURERS =========== -->
    @if (tab === 'manufacturers') {
      <div class="panel" role="tabpanel">
        <div class="panel-header">
          <h2>{{ t('admin.catalog.manufacturers') }}</h2>
          <button type="button" class="new-btn" (click)="openManufacturerForm()">+ {{ t('admin.catalog.newManufacturer') }}</button>
        </div>

        @if (mfrFormOpen) {
          <form class="inline-form" (ngSubmit)="submitManufacturer()" [attr.aria-label]="editingManufacturerId ? t('admin.catalog.editManufacturer') : t('admin.catalog.newManufacturer')">
            <div class="form-title">{{ editingManufacturerId ? t('admin.catalog.editManufacturer') : t('admin.catalog.newManufacturer') }}</div>
            @if (mfrError) { <p class="form-error" role="alert">{{ mfrError }}</p> }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="mfrForm.name" name="name" required /></label>
            <label>{{ t('admin.common.description') }} <textarea [(ngModel)]="mfrForm.description" name="description" rows="2"></textarea></label>
            <app-media-image-field [label]="t('admin.catalog.manufacturerImage')" purpose="manufacturer" [(pictureId)]="mfrForm.pictureId" />
            <div class="form-row">
              <label class="check-label"><input type="checkbox" [(ngModel)]="mfrForm.published" name="published" /> {{ t('admin.catalog.published') }}</label>
              <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="mfrForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            </div>
            <div class="form-actions">
              <button type="submit" [disabled]="mfrSaving">{{ mfrSaving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeManufacturerForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (mfrLoading) { <p class="state">{{ t('admin.catalog.loadingManufacturers') }}</p> }
        @if (mfrLoadError) { <p class="state state-error" role="alert">{{ mfrLoadError }}</p> }
        @if (!mfrLoading && manufacturers.length === 0 && !mfrLoadError) { <p class="state">{{ t('admin.catalog.noManufacturers') }}</p> }

        <div class="item-list">
          @for (mfr of manufacturers; track mfr.id) {
            <div class="item-row">
              <div class="item-info">
                <span class="item-name">{{ mfr.name }}</span>
                @if (!mfr.published) { <span class="badge-unpub">{{ t('admin.catalog.unpublished') }}</span> }
              </div>
              <div class="item-actions">
                <button type="button" (click)="editManufacturer(mfr)">{{ t('common.actions.edit') }}</button>
                <button type="button" class="del-btn" (click)="deleteManufacturer(mfr.id)">{{ t('common.actions.delete') }}</button>
              </div>
            </div>
          }
        </div>

        @if (mfrTotalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="mfrPage <= 1" (click)="loadManufacturers(mfrPage - 1)">← {{ t('common.pagination.prev') }}</button>
            <span>{{ mfrPage }} / {{ mfrTotalPages }}</span>
            <button type="button" [disabled]="mfrPage >= mfrTotalPages" (click)="loadManufacturers(mfrPage + 1)">{{ t('common.pagination.next') }} →</button>
          </div>
        }
      </div>
    }
    </ng-container>
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
    .notice { margin: 1rem 0; padding: .75rem 1rem; border-left: 3px solid #b74e3c; background: #f8e9e4; }
    .pick-list { border: 1px solid var(--line); padding: .6rem .9rem; display: grid; gap: .35rem; max-height: 200px; overflow: auto; }
    .pick-list legend { color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; padding: 0 .3rem; }
    .muted { color: var(--muted); font-size: .85rem; }
    .hidden-reason { flex-basis: 100%; margin: .4rem 0 0; color: #7d3026; font-size: .85rem; }
    .hide-form { flex-basis: 100%; display: grid; gap: .6rem; margin-top: .6rem; }
    .transfer { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; }
    select { border: 1px solid var(--line-strong); padding: .55rem; background: var(--paper); font: inherit; }
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
  private readonly transloco = inject(TranslocoService);
  readonly currency = inject(CurrencyService);
  private readonly vendorApi = inject(VendorApiService);

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
  parentOptions: ParentOption[] = [];
  private categoryTree: AdminCategoryTreeNode[] = [];
  notice: string | null = null;

  // ----- Products -----
  products: AdminProductResponse[] = [];
  prodLoading = false;
  prodLoadError: string | null = null;
  prodPage = 1;
  prodTotalPages = 1;
  prodSearch = '';
  prodFilter: 'all' | 'review' | 'hiddenByAdmin' | 'live' | 'draft' | 'stopped' = 'all';
  hidingId: number | null = null;
  hideReason = '';
  prodFormOpen = false;
  prodSaving = false;
  prodError: string | null = null;
  editingProductId: number | null = null;
  prodForm: ProductForm = this.emptyProdForm();
  categoryOptions: ParentOption[] = [];
  shops: VendorResponse[] = [];
  editingVendorId = 0;
  editingVendorName = '';
  transferVendorId = 0;
  manufacturerOptions: AdminManufacturerResponse[] = [];

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
      error: () => { this.catLoadError = this.transloco.translate('admin.catalog.errors.loadCategories'); this.catLoading = false; }
    });
  }

  openCategoryForm() {
    this.editingCategoryId = null;
    this.catForm = this.emptyCatForm();
    this.catError = null;
    this.notice = null;
    this.loadParentOptions(null);
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
      pictureId: cat.pictureId,
      showOnHomepage: cat.showOnHomepage, published: cat.published,
      restrictFromVendors: cat.restrictFromVendors, displayOrder: cat.displayOrder
    };
    this.catError = null;
    this.notice = null;
    this.loadParentOptions(cat.id);
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
      pictureId: this.catForm.pictureId,
      showOnHomepage: this.catForm.showOnHomepage,
      published: this.catForm.published,
      restrictFromVendors: this.catForm.restrictFromVendors,
      displayOrder: this.catForm.displayOrder
    };
    const obs = this.editingCategoryId
      ? this.api.adminUpdateCategory(this.editingCategoryId, req)
      : this.api.adminCreateCategory(req);
    obs.subscribe({
      next: () => { this.catSaving = false; this.closeCategoryForm(); this.loadCategories(this.catPage); },
      error: err => { this.catError = extractError(err, this.transloco.translate('admin.common.saveFailed')); this.catSaving = false; }
    });
  }

  deleteCategory(id: number) {
    if (!confirm(this.transloco.translate('admin.catalog.confirmDeleteCategory'))) return;
    this.notice = null;
    this.api.adminDeleteCategory(id).subscribe({
      next: () => this.loadCategories(this.catPage),
      error: err => { this.notice = conflictMessage(err, this.transloco.translate('admin.catalog.errors.deleteCategory')); }
    });
  }

  // ---- Product CRUD ----

  loadProducts(page: number) {
    this.prodLoading = true;
    this.prodLoadError = null;
    const status = this.prodFilter === 'all' ? null : this.prodFilter === 'review' ? 'hiddenByAdmin' : this.prodFilter;
    this.api.adminGetProducts(page, 50, this.prodSearch || null, null, status, this.prodFilter === 'review').subscribe({
      next: r => { this.products = r.items; this.prodPage = r.page; this.prodTotalPages = r.totalPages; this.prodLoading = false; },
      error: () => { this.prodLoadError = this.transloco.translate('admin.catalog.errors.loadProducts'); this.prodLoading = false; }
    });
  }

  openProductForm() {
    this.editingProductId = null;
    this.prodForm = this.emptyProdForm();
    this.prodError = null;
    this.loadTaxonomyOptions();
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
        this.editingVendorId = prod.vendorId;
        this.editingVendorName = prod.vendorName ?? `#${prod.vendorId}`;
        this.transferVendorId = 0;
        this.prodForm = {
          vendorId: prod.vendorId,
          name: prod.name,
          shortDescription: prod.shortDescription ?? '',
          fullDescription: prod.fullDescription ?? '',
          price: prod.price, oldPrice: prod.oldPrice, stockQuantity: prod.stockQuantity,
          published: prod.published, showOnHomepage: prod.showOnHomepage, displayOrder: prod.displayOrder,
          categoryIds: [...detail.categoryIds],
          manufacturerIds: [...detail.manufacturerIds]
        };
        this.prodError = null;
        this.loadTaxonomyOptions();
        this.prodFormOpen = true;
        this.prodSaving = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => { this.prodSaving = false; alert(this.transloco.translate('admin.catalog.errors.loadProduct')); }
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
      categoryIds: this.prodForm.categoryIds,
      manufacturerIds: this.prodForm.manufacturerIds,
      // The owner is only chosen on creation. Updates never send it; the API rejects attempts to change it.
      ...(this.editingProductId || !this.prodForm.vendorId ? {} : { vendorId: this.prodForm.vendorId })
    };
    const obs = this.editingProductId
      ? this.api.adminUpdateProduct(this.editingProductId, req)
      : this.api.adminCreateProduct(req);
    obs.subscribe({
      next: () => { this.prodSaving = false; this.closeProductForm(); this.loadProducts(this.prodPage); },
      error: err => { this.prodError = extractError(err, this.transloco.translate('admin.common.saveFailed')); this.prodSaving = false; }
    });
  }

  deleteProduct(id: number) {
    if (!confirm(this.transloco.translate('admin.catalog.confirmDeleteProduct'))) return;
    this.api.adminDeleteProduct(id).subscribe({
      next: () => this.loadProducts(this.prodPage),
      error: () => alert(this.transloco.translate('admin.catalog.errors.deleteProduct'))
    });
  }

  // ---- Manufacturer CRUD ----

  loadManufacturers(page: number) {
    this.mfrLoading = true;
    this.mfrLoadError = null;
    this.api.adminGetManufacturers(page).subscribe({
      next: r => { this.manufacturers = r.items; this.mfrPage = r.page; this.mfrTotalPages = r.totalPages; this.mfrLoading = false; },
      error: () => { this.mfrLoadError = this.transloco.translate('admin.catalog.errors.loadManufacturers'); this.mfrLoading = false; }
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
      name: mfr.name, description: mfr.description ?? '', pictureId: mfr.pictureId,
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
      pictureId: this.mfrForm.pictureId,
      published: this.mfrForm.published,
      displayOrder: this.mfrForm.displayOrder
    };
    const obs = this.editingManufacturerId
      ? this.api.adminUpdateManufacturer(this.editingManufacturerId, req)
      : this.api.adminCreateManufacturer(req);
    obs.subscribe({
      next: () => { this.mfrSaving = false; this.closeManufacturerForm(); this.loadManufacturers(this.mfrPage); },
      error: err => { this.mfrError = extractError(err, this.transloco.translate('admin.common.saveFailed')); this.mfrSaving = false; }
    });
  }

  deleteManufacturer(id: number) {
    if (!confirm(this.transloco.translate('admin.catalog.confirmDeleteManufacturer'))) return;
    this.notice = null;
    this.api.adminDeleteManufacturer(id).subscribe({
      next: () => this.loadManufacturers(this.mfrPage),
      error: err => { this.notice = conflictMessage(err, this.transloco.translate('admin.catalog.errors.deleteManufacturer')); }
    });
  }

  // ---- Taxonomy pickers ----

  toggleId(list: number[], id: number) {
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1);
    else list.push(id);
  }

  /** Parent choices: every category except the one being edited and its own subcategories. */
  private loadParentOptions(editingId: number | null) {
    this.api.adminGetCategoryTree().subscribe({
      next: tree => {
        this.categoryTree = tree;
        this.parentOptions = flattenTree(tree, editingId);
      },
      error: () => { this.parentOptions = []; this.catError = this.transloco.translate('admin.catalog.errors.loadCategoryList'); }
    });
  }

  startHide(prod: AdminProductResponse) {
    this.hidingId = prod.id;
    this.hideReason = '';
    this.notice = null;
  }

  confirmHide(prod: AdminProductResponse) {
    if (!this.hideReason.trim()) return;
    this.prodSaving = true;
    this.notice = null;
    this.api.adminHideProduct(prod.id, this.hideReason.trim()).subscribe({
      next: () => { this.prodSaving = false; this.hidingId = null; this.loadProducts(this.prodPage); },
      error: err => { this.prodSaving = false; this.notice = conflictMessage(err, extractError(err, this.transloco.translate('admin.catalog.errors.hide'))); }
    });
  }

  unhideProduct(prod: AdminProductResponse) {
    this.notice = null;
    this.api.adminUnhideProduct(prod.id).subscribe({
      next: () => this.loadProducts(this.prodPage),
      error: err => { this.notice = conflictMessage(err, this.transloco.translate('admin.catalog.errors.unhide')); }
    });
  }

  statusLabel(status: AdminProductResponse['status']) {
    return this.transloco.translate('admin.catalog.status.' + status);
  }

  transferProduct() {
    if (!this.editingProductId || !this.transferVendorId) return;
    const target = this.shops.find(s => s.id === this.transferVendorId);
    if (!confirm(this.transloco.translate('admin.catalog.confirmTransfer', { name: target?.name ?? this.transloco.translate('admin.catalog.selectedShop') }))) return;
    this.prodSaving = true;
    this.prodError = null;
    this.api.adminTransferProduct(this.editingProductId, this.transferVendorId).subscribe({
      next: moved => {
        this.prodSaving = false;
        this.editingVendorId = moved.vendorId;
        this.editingVendorName = moved.vendorName ?? target?.name ?? '';
        this.transferVendorId = 0;
        this.loadProducts(this.prodPage);
      },
      error: err => { this.prodError = extractError(err, this.transloco.translate('admin.catalog.errors.transfer')); this.prodSaving = false; }
    });
  }

  private loadTaxonomyOptions() {
    this.vendorApi.getVendors(1, 100).subscribe({ next: r => { this.shops = r.items.filter(v => v.active !== false); }, error: () => { this.shops = []; } });
    this.api.adminGetCategoryTree().subscribe({
      next: tree => { this.categoryTree = tree; this.categoryOptions = flattenTree(tree, null); },
      error: () => { this.categoryOptions = []; }
    });
    this.api.adminGetManufacturers(1, 100).subscribe({
      next: r => { this.manufacturerOptions = r.items; },
      error: () => { this.manufacturerOptions = []; }
    });
  }

  formatPrice(price: number): string {
    return this.currency.formatPrimary(price);
  }

  private emptyCatForm(): CategoryForm {
    return { name: '', description: '', parentCategoryId: 0, pictureId: 0, showOnHomepage: false, published: true, restrictFromVendors: false, displayOrder: 0 };
  }

  private emptyProdForm(): ProductForm {
    return { vendorId: 0, name: '', shortDescription: '', fullDescription: '', price: 0, oldPrice: 0, stockQuantity: 0, published: true, showOnHomepage: false, displayOrder: 0, categoryIds: [], manufacturerIds: [] };
  }

  private emptyMfrForm(): ManufacturerForm {
    return { name: '', description: '', pictureId: 0, published: true, displayOrder: 0 };
  }
}

/** Flattens the tree into indented labels, skipping one category and its subcategories. */
function flattenTree(nodes: AdminCategoryTreeNode[], excludeId: number | null, depth = 0): ParentOption[] {
  return nodes.flatMap(node => {
    if (node.id === excludeId) return [];
    const label = `${'— '.repeat(depth)}${node.name}${node.published ? '' : ` (${translate('admin.catalog.unpublishedLower')})`}`;
    return [{ id: node.id, label }, ...flattenTree(node.children, excludeId, depth + 1)];
  });
}

const conflictMessages: Record<string, string> = {
  'category.has_children': 'errors.category.has_children',
  'category.in_use': 'errors.category.in_use',
  'manufacturer.in_use': 'errors.manufacturer.in_use',
  'product.already_hidden': 'errors.product.already_hidden',
  'product.not_hidden': 'errors.product.not_hidden'
};

function conflictMessage(err: { status?: number; message?: string }, fallback: string): string {
  const key = err.status === 409 && err.message ? conflictMessages[err.message] : undefined;
  return key ? translate(key) : fallback;
}

function extractError(err: { error?: { errors?: Record<string, string[]> }; fieldErrors?: Record<string, string[]> }, fallback: string): string {
  // The error interceptor moves validation errors to `fieldErrors`; keep reading `error.errors` for raw responses.
  const errors = err?.fieldErrors ?? err?.error?.errors;
  if (errors) {
    return Object.values(errors).flat().join(' ');
  }
  return fallback;
}
