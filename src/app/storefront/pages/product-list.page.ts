import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { CartService } from '../../core/cart/cart.service';
import { CartNoticeComponent } from '../../shared/components/cart-notice/cart-notice.component';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { CatalogApiService, ProductListParams } from '../../core/catalog/catalog-api.service';
import { CategoryTreeNode, ProductFacets, ProductResponse } from '../../core/catalog/catalog.models';
import { ProductCardModel } from '../../shared/models/product-card.model';

interface Chip {
  label: string;
  remove: () => void;
}

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, CartNoticeComponent, EmptyStateComponent, ProductCardComponent, FormsModule, SearchBoxComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: t('storefront.products.breadcrumb'), url: '/storefront/products' }]" />
      <div class="heading-row">
        <div>
          <div class="eyebrow">{{ t('storefront.products.eyebrow') }}</div>
          <h1>@if (search) { {{ t('storefront.products.resultsFor', { search: search }) }} } @else { {{ t('storefront.products.title') }} }</h1>
        </div>
        <app-search-box [value]="search" (searched)="onSearch($event)" />
      </div>
    </div>

    <app-cart-notice [message]="cartMessage" [error]="cartFailed" (dismissed)="cartMessage = ''" />

    <div class="catalog-layout">
      <aside class="sidebar" [attr.aria-label]="t('storefront.products.filters')">
        <div class="sidebar-section">
          <div class="sidebar-label">{{ t('storefront.products.categories') }}</div>
          <button class="sidebar-item" [class.active]="!activeCategoryId" (click)="selectCategory(null)">{{ t('storefront.products.all') }}</button>
          @for (node of categoryTree; track node.id) {
            <button class="sidebar-item" [class.active]="activeCategoryId === node.id" (click)="selectCategory(node.id)">{{ node.name }}</button>
            @for (child of node.children; track child.id) {
              <button class="sidebar-item sidebar-item-child" [class.active]="activeCategoryId === child.id" (click)="selectCategory(child.id)">{{ child.name }}</button>
            }
          }
        </div>

        <div class="sidebar-section">
          <div class="sidebar-label">{{ t('storefront.products.price') }}</div>
          <form class="price-form" (ngSubmit)="applyPrice()" novalidate>
            <input type="number" name="min" min="0" step="0.01" [placeholder]="t('storefront.products.min')" [(ngModel)]="minPriceInput" [attr.aria-label]="t('storefront.products.minPrice')" />
            <input type="number" name="max" min="0" step="0.01" [placeholder]="t('storefront.products.max')" [(ngModel)]="maxPriceInput" [attr.aria-label]="t('storefront.products.maxPrice')" />
            <button type="submit" class="apply">{{ t('storefront.products.apply') }}</button>
          </form>
          @if (priceError) { <p class="field-error" role="alert">{{ t(priceError) }}</p> }
          @if (facets && facets.minPrice !== null && facets.maxPrice !== null) {
            <p class="hint">{{ t('storefront.products.priceRange', { min: money(facets.minPrice), max: money(facets.maxPrice) }) }}</p>
          }
        </div>

        <div class="sidebar-section">
          <label class="check"><input type="checkbox" [checked]="inStock" (change)="toggleInStock()" /> {{ t('storefront.products.inStockOnly') }}</label>
        </div>

        @if (facets && facets.manufacturers.length > 0) {
          <div class="sidebar-section">
            <div class="sidebar-label">{{ t('storefront.productDetail.brand') }}</div>
            @for (m of facets.manufacturers; track m.id) {
              <label class="check"><input type="checkbox" [checked]="manufacturerIds.includes(m.id)" (change)="toggleNumber('manufacturerIds', m.id)" /> {{ m.name }} <span class="count">{{ m.count }}</span></label>
            }
          </div>
        }

        @if (facets) {
          @for (spec of facets.specifications; track spec.id) {
            <div class="sidebar-section">
              <div class="sidebar-label">{{ spec.name }}</div>
              @for (o of spec.options; track o.id) {
                <label class="check"><input type="checkbox" [checked]="specOptionIds.includes(o.id)" (change)="toggleNumber('specOptionIds', o.id)" /> {{ o.name }} <span class="count">{{ o.count }}</span></label>
              }
            </div>
          }
          @if (facets.tags.length > 0) {
            <div class="sidebar-section">
              <div class="sidebar-label">{{ t('storefront.products.tags') }}</div>
              <div class="tag-list">
                @for (tag of facets.tags; track tag.name) {
                  <button type="button" class="tag" [class.active]="tags.includes(tag.name)" [attr.aria-pressed]="tags.includes(tag.name)" (click)="toggleTag(tag.name)">{{ tag.name }} <span class="count">{{ tag.count }}</span></button>
                }
              </div>
            </div>
          }
        }
      </aside>

      <div class="catalog-main">
        <section class="catalog-toolbar" [attr.aria-label]="t('storefront.home.controls')">
          @if (!loading) {
            <span>{{ t('storefront.products.itemCount', { count: totalCount }) }}</span>
          }
          <label class="sort-label">{{ t('storefront.products.sort') }}
            <select [attr.aria-label]="t('storefront.products.sortLabel')" [(ngModel)]="sort" (change)="onSortChange()">
              @if (search) { <option value="Relevance">{{ t('storefront.products.sortRelevance') }}</option> }
              <option value="DisplayOrder">{{ t('storefront.products.sortFeatured') }}</option>
              <option value="PriceAsc">{{ t('storefront.products.sortPriceAsc') }}</option>
              <option value="PriceDesc">{{ t('storefront.products.sortPriceDesc') }}</option>
              <option value="Newest">{{ t('storefront.products.sortNewest') }}</option>
              <option value="NameAsc">{{ t('storefront.products.sortNameAsc') }}</option>
            </select>
          </label>
        </section>

        @if (chips().length > 0) {
          <div class="chips" [attr.aria-label]="t('storefront.products.activeFilters')">
            @for (chip of chips(); track chip.label) {
              <button type="button" class="chip" (click)="chip.remove()" [attr.aria-label]="t('storefront.products.removeFilter', { label: chip.label })">{{ chip.label }} ×</button>
            }
            <button type="button" class="chip clear" (click)="clearAll()">{{ t('storefront.products.clearAll') }}</button>
          </div>
        }

        @if (loading) { <p class="state">{{ t('storefront.products.loading') }}</p> }
        @if (error) { <p class="state state-error" role="alert">{{ t(error) }}</p> }

        @if (!loading && !error) {
          @if (items().length === 0) {
            <app-empty-state [title]="t('storefront.products.emptyTitle')" [message]="t('storefront.products.emptyMessage')" mark="00" />
            @if (chips().length > 0) {
              <div class="empty-actions"><button type="button" class="chip clear" (click)="clearAll()">{{ t('storefront.products.clearAllFilters') }}</button></div>
            }
          } @else {
            <section class="product-grid" [attr.aria-label]="t('storefront.products.breadcrumb')">
              @for (product of cards(); track product.id) {
                <app-product-card [product]="product" (addToCart)="addFromCard($event)" />
              }
            </section>

            @if (totalPages > 1) {
              <nav class="pagination" [attr.aria-label]="t('common.pagination.label')">
                <button type="button" [disabled]="page <= 1" (click)="goToPage(page - 1)">← {{ t('common.pagination.prev') }}</button>
                <span class="pagination-info">{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
                <button type="button" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">{{ t('common.pagination.next') }} →</button>
              </nav>
            }
          }
        }
      </div>
    </div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { padding: 1rem 0 3.5rem; animation: rise-in 600ms ease both; }
    .heading-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 420px); gap: 2rem; align-items: end; margin-top: 2.5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 1rem 0 0; font: 700 clamp(2.5rem, 6vw, 5.5rem)/.94 var(--display-font); overflow-wrap: anywhere; }
    .catalog-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 3rem; align-items: start; }
    .sidebar { border-right: 1px solid var(--line); padding-right: 1.5rem; display: grid; gap: 1.5rem; }
    .sidebar-label { color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .12em; text-transform: uppercase; margin-bottom: .75rem; }
    .sidebar-item { display: block; width: 100%; text-align: left; padding: .5rem .6rem; border: none; background: transparent; color: var(--ink); font: inherit; font-size: .9rem; cursor: pointer; border-radius: 2px; }
    .sidebar-item:hover { background: rgba(39,116,93,.08); }
    .sidebar-item.active { background: var(--ink); color: var(--paper); }
    .sidebar-item-child { padding-left: 1.4rem; font-size: .85rem; color: var(--muted); }
    .sidebar-item-child.active { background: var(--ink); color: var(--paper); }
    .price-form { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; }
    .price-form input { min-width: 0; border: 1px solid var(--line-strong); padding: .4rem .5rem; background: transparent; color: var(--ink); font: inherit; font-size: .85rem; }
    .apply { grid-column: 1 / -1; border: 1px solid var(--ink); padding: .4rem; background: transparent; color: var(--ink); font: 700 .78rem inherit; cursor: pointer; }
    .apply:hover { background: var(--ink); color: var(--paper); }
    .hint { margin: .4rem 0 0; color: var(--muted); font: .68rem var(--mono-font); }
    .field-error { margin: .4rem 0 0; color: #8d3128; font-size: .78rem; }
    .check { display: flex; align-items: center; gap: .5rem; padding: .2rem 0; font-size: .88rem; cursor: pointer; }
    .count { margin-left: auto; color: var(--muted); font: .68rem var(--mono-font); }
    .tag-list { display: flex; flex-wrap: wrap; gap: .35rem; }
    .tag { border: 1px solid var(--line); padding: .2rem .55rem; background: transparent; color: var(--ink); font: .75rem var(--mono-font); cursor: pointer; }
    .tag.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
    .chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1.25rem; }
    .chip { border: 1px solid var(--line-strong); padding: .3rem .65rem; background: transparent; color: var(--ink); font: .75rem var(--mono-font); cursor: pointer; }
    .chip:hover { border-color: var(--ink); }
    .chip.clear { border-style: dashed; color: var(--muted); }
    .empty-actions { display: flex; justify-content: center; padding-bottom: 2rem; }
    .catalog-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .9rem 0; border-top: 1px solid var(--line-strong); border-bottom: 1px solid var(--line); color: var(--muted); font: 500 .72rem var(--mono-font); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1.5rem; }
    .sort-label { display: flex; align-items: center; gap: .4rem; }
    select { border: 1px solid var(--line-strong); padding: .4rem .6rem; background: transparent; color: var(--ink); font: inherit; cursor: pointer; }
    .product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; padding-bottom: 3rem; }
    .state { color: var(--muted); padding: 2rem 0; }
    .state-error { color: #8d3128; }
    .pagination { display: flex; align-items: center; gap: 1rem; padding: 2rem 0; border-top: 1px solid var(--line); }
    .pagination button { border: 1px solid var(--line-strong); padding: .6rem 1rem; background: transparent; color: var(--ink); font: inherit; cursor: pointer; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .pagination-info { color: var(--muted); font: .75rem var(--mono-font); }
    @media (max-width: 900px) { .catalog-layout { grid-template-columns: 1fr; } .sidebar { border-right: none; border-bottom: 1px solid var(--line); padding-right: 0; padding-bottom: 1rem; } .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .heading-row { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .product-grid { grid-template-columns: 1fr; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductListPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly media = inject(MediaApiService);
  private readonly currency = inject(CurrencyService);
  private readonly cart = inject(CartService);
  private readonly transloco = inject(TranslocoService);
  cartMessage = '';
  cartFailed = false;

  /** The raw items; the cards are derived so a change of display currency updates the prices at once. */
  readonly items = signal<ProductResponse[]>([]);
  readonly cards = computed<ProductCardModel[]>(() =>
    this.items().map(p => toProductCard(p, this.media.url(p.mainPictureId), value => this.currency.format(value))));
  categoryTree: CategoryTreeNode[] = [];
  facets: ProductFacets | null = null;
  loading = true;
  error: string | null = null;
  totalCount = 0;
  page = 1;
  pageSize = 20;
  totalPages = 1;

  // Everything the customer chose lives in the URL, so a result can be shared and the back button works.
  search = '';
  activeCategoryId: number | null = null;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  inStock = false;
  manufacturerIds: number[] = [];
  specOptionIds: number[] = [];
  tags: string[] = [];
  sort = 'DisplayOrder';

  minPriceInput: number | null = null;
  maxPriceInput: number | null = null;
  priceError = '';

  /** The filters that decide the facets (everything except paging, sort and the facet selections). */
  private facetKey = '';

  ngOnInit() {
    this.api.getCategoryTree().subscribe({
      next: tree => this.categoryTree = tree,
      error: () => {}
    });

    this.route.queryParamMap.subscribe(params => {
      this.page = Number(params.get('page') ?? 1) || 1;
      this.activeCategoryId = params.has('categoryId') ? Number(params.get('categoryId')) : null;
      this.search = params.get('search') ?? '';
      this.minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : null;
      this.maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : null;
      this.minPriceInput = this.minPrice;
      this.maxPriceInput = this.maxPrice;
      this.inStock = params.get('inStock') === 'true';
      this.manufacturerIds = params.getAll('manufacturerIds').map(Number).filter(Number.isFinite);
      this.specOptionIds = params.getAll('specOptionIds').map(Number).filter(Number.isFinite);
      this.tags = params.getAll('tags');
      this.sort = params.get('sort') ?? (this.search ? 'Relevance' : 'DisplayOrder');
      this.loadProducts();
      this.loadFacets();
    });
  }

  private filters(): ProductListParams {
    return {
      categoryId: this.activeCategoryId,
      search: this.search || null,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      inStock: this.inStock,
      manufacturerIds: this.manufacturerIds,
      specOptionIds: this.specOptionIds,
      tags: this.tags
    };
  }

  loadProducts() {
    this.loading = true;
    this.error = null;
    this.api.getProducts({ ...this.filters(), page: this.page, pageSize: this.pageSize, sort: this.sort }).subscribe({
      next: result => {
        this.items.set(result.items);
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: err => {
        this.error = err?.status === 400 && err?.fieldErrors
          ? 'storefront.products.invalidFilters'
          : 'storefront.products.loadError';
        this.loading = false;
      }
    });
  }

  /** Facets only change when the base filters do, not when the customer pages, sorts or picks a facet. */
  private loadFacets() {
    const key = JSON.stringify([this.search, this.activeCategoryId, this.minPrice, this.maxPrice, this.inStock]);
    if (key === this.facetKey) return;
    this.facetKey = key;
    this.api.getFacets(this.filters()).subscribe({
      next: facets => { this.facets = facets; },
      error: () => { this.facets = null; }
    });
  }

  // ---- Actions: each one writes the URL, and the URL drives the load ----

  private go(patch: Params) {
    this.router.navigate([], { queryParams: { page: 1, ...patch }, queryParamsHandling: 'merge' });
  }

  selectCategory(id: number | null) { this.go({ categoryId: id ?? undefined }); }

  onSearch(query: string) {
    // A new search starts over; the sort goes back to the default for that kind of list.
    this.router.navigate(['/storefront/products'], { queryParams: { search: query || undefined, page: 1 } });
  }

  onSortChange() { this.go({ sort: this.sort }); }

  goToPage(p: number) { this.router.navigate([], { queryParams: { page: p }, queryParamsHandling: 'merge' }); }

  applyPrice() {
    const min = this.minPriceInput === null || (this.minPriceInput as unknown) === '' ? null : Number(this.minPriceInput);
    const max = this.maxPriceInput === null || (this.maxPriceInput as unknown) === '' ? null : Number(this.maxPriceInput);
    if ((min !== null && min < 0) || (max !== null && max < 0)) { this.priceError = 'storefront.products.priceNegative'; return; }
    if (min !== null && max !== null && min > max) { this.priceError = 'storefront.products.priceOrder'; return; }
    this.priceError = '';
    this.go({ minPrice: min ?? undefined, maxPrice: max ?? undefined });
  }

  toggleInStock() { this.go({ inStock: this.inStock ? undefined : true }); }

  toggleNumber(key: 'manufacturerIds' | 'specOptionIds', id: number) {
    const current = this[key];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    this.go({ [key]: next.length ? next : undefined });
  }

  toggleTag(name: string) {
    const next = this.tags.includes(name) ? this.tags.filter(x => x !== name) : [...this.tags, name];
    this.go({ tags: next.length ? next : undefined });
  }

  clearAll() {
    this.priceError = '';
    this.router.navigate([], { queryParams: { search: this.search || undefined, page: 1 } });
  }

  /** The filters in force, each with a way to take it off (the search text is not a chip: the search box shows it). */
  chips(): Chip[] {
    const list: Chip[] = [];
    if (this.activeCategoryId) list.push({ label: this.transloco.translate('storefront.products.chipCategory', { name: this.categoryName(this.activeCategoryId) }), remove: () => this.selectCategory(null) });
    if (this.minPrice !== null || this.maxPrice !== null) {
      list.push({ label: this.transloco.translate('storefront.products.chipPrice', { min: this.minPrice ?? 0, max: this.maxPrice ?? '∞' }), remove: () => this.go({ minPrice: undefined, maxPrice: undefined }) });
    }
    if (this.inStock) list.push({ label: this.transloco.translate('storefront.products.chipInStock'), remove: () => this.toggleInStock() });
    for (const id of this.manufacturerIds) {
      list.push({ label: this.transloco.translate('storefront.products.chipBrand', { name: this.facets?.manufacturers.find(m => m.id === id)?.name ?? id }), remove: () => this.toggleNumber('manufacturerIds', id) });
    }
    for (const id of this.specOptionIds) {
      list.push({ label: this.specOptionLabel(id), remove: () => this.toggleNumber('specOptionIds', id) });
    }
    for (const tag of this.tags) list.push({ label: this.transloco.translate('storefront.products.chipTag', { name: tag }), remove: () => this.toggleTag(tag) });
    return list;
  }

  addFromCard(card: ProductCardModel) {
    this.cartMessage = '';
    this.cart.add(card.id, 1, [], this.router.url).subscribe(outcome => {
      this.cartFailed = outcome.kind === 'error';
      if (outcome.kind === 'added') this.cartMessage = this.transloco.translate('storefront.cart.added', { name: card.name });
      // A product with variants needs its options chosen on its own page.
      else if (outcome.kind === 'choose-options') this.router.navigate(['/storefront/products', card.id]);
      else if (outcome.kind === 'error') this.cartMessage = outcome.message;
    });
  }

  money(value: number) { return this.currency.format(value); }

  private categoryName(id: number): string {
    for (const node of this.categoryTree) {
      if (node.id === id) return node.name;
      const child = node.children.find(c => c.id === id);
      if (child) return child.name;
    }
    return `#${id}`;
  }

  private specOptionLabel(id: number): string {
    for (const spec of this.facets?.specifications ?? []) {
      const option = spec.options.find(o => o.id === id);
      if (option) return `${spec.name}: ${option.name}`;
    }
    return `Filter ${id}`;
  }
}

const BLANK_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23e4e8df'/%3E%3C/svg%3E`;

function toProductCard(p: ProductResponse, pictureUrl: string | null, format: (value: number) => string): ProductCardModel {
  return {
    id: p.id,
    name: p.name,
    category: '',
    price: format(p.finalPrice),
    compareAtPrice: p.onSale ? format(p.price) : p.oldPrice > 0 ? format(p.oldPrice) : undefined,
    badge: p.onSale ? 'storefront.card.sale' : undefined,
    imageUrl: pictureUrl ?? BLANK_IMAGE,
    rating: undefined,
    reviewCount: undefined,
    shopName: p.vendorName,
    shopId: p.vendorId,
    outOfStock: !p.inStock
  };
}

