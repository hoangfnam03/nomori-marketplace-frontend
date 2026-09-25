import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { CategoryTreeNode, ProductResponse } from '../../core/catalog/catalog.models';
import { ProductCardModel } from '../../shared/models/product-card.model';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, EmptyStateComponent, ProductCardComponent, RouterLink, FormsModule, SearchBoxComponent],
  template: `
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: 'Products', url: '/storefront/products' }]" />
      <div class="heading-row">
        <div>
          <div class="eyebrow">Storefront / Catalog</div>
          <h1>Browse the collection.</h1>
        </div>
        <app-search-box (searched)="onSearch($event)" />
      </div>
    </div>

    <div class="catalog-layout">
      <aside class="sidebar" aria-label="Filters">
        <div class="sidebar-section">
          <div class="sidebar-label">Categories</div>
          <button class="sidebar-item" [class.active]="!activeCategoryId" (click)="selectCategory(null)">All</button>
          @for (node of categoryTree; track node.id) {
            <button class="sidebar-item" [class.active]="activeCategoryId === node.id" (click)="selectCategory(node.id)">{{ node.name }}</button>
            @for (child of node.children; track child.id) {
              <button class="sidebar-item sidebar-item-child" [class.active]="activeCategoryId === child.id" (click)="selectCategory(child.id)">{{ child.name }}</button>
            }
          }
        </div>
      </aside>

      <div class="catalog-main">
        <section class="catalog-toolbar" aria-label="Catalog controls">
          @if (!loading) {
            <span>{{ totalCount }} item{{ totalCount === 1 ? '' : 's' }}</span>
          }
          <label class="sort-label">Sort
            <select aria-label="Sort products" [(ngModel)]="sort" (change)="onSortChange()">
              <option value="DisplayOrder">Featured</option>
              <option value="PriceAsc">Price: low to high</option>
              <option value="PriceDesc">Price: high to low</option>
              <option value="Newest">Newest</option>
            </select>
          </label>
        </section>

        @if (loading) { <p class="state">Loading products...</p> }
        @if (error) { <p class="state state-error" role="alert">{{ error }}</p> }

        @if (!loading && !error) {
          @if (products.length === 0) {
            <app-empty-state title="No products found" message="Try adjusting your filters or search query." mark="00" />
          } @else {
            <section class="product-grid" aria-label="Products">
              @for (product of products; track product.id) {
                <app-product-card [product]="product" />
              }
            </section>

            @if (totalPages > 1) {
              <nav class="pagination" aria-label="Pagination">
                <button type="button" [disabled]="page <= 1" (click)="goToPage(page - 1)">← Prev</button>
                <span class="pagination-info">Page {{ page }} of {{ totalPages }}</span>
                <button type="button" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Next →</button>
              </nav>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-heading { padding: 1rem 0 3.5rem; animation: rise-in 600ms ease both; }
    .heading-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 420px); gap: 2rem; align-items: end; margin-top: 2.5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 1rem 0 0; font: 700 clamp(2.5rem, 6vw, 5.5rem)/.94 var(--display-font); }
    .catalog-layout { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 3rem; align-items: start; }
    .sidebar { border-right: 1px solid var(--line); padding-right: 1.5rem; }
    .sidebar-label { color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .12em; text-transform: uppercase; margin-bottom: .75rem; }
    .sidebar-item { display: block; width: 100%; text-align: left; padding: .5rem .6rem; border: none; background: transparent; color: var(--ink); font: inherit; font-size: .9rem; cursor: pointer; border-radius: 2px; }
    .sidebar-item:hover { background: rgba(39,116,93,.08); }
    .sidebar-item.active { background: var(--ink); color: var(--paper); }
    .sidebar-item-child { padding-left: 1.4rem; font-size: .85rem; color: var(--muted); }
    .sidebar-item-child.active { background: var(--ink); color: var(--paper); }
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
    @media (max-width: 900px) { .catalog-layout { grid-template-columns: 1fr; } .sidebar { border-right: none; border-bottom: 1px solid var(--line); padding-right: 0; padding-bottom: 1rem; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; } .sidebar-section { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; } .sidebar-label { flex: 0 0 100%; margin-bottom: 0; } .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .heading-row { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .product-grid { grid-template-columns: 1fr; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductListPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  products: ProductCardModel[] = [];
  categoryTree: CategoryTreeNode[] = [];
  loading = true;
  error: string | null = null;
  totalCount = 0;
  page = 1;
  pageSize = 20;
  totalPages = 1;
  activeCategoryId: number | null = null;
  sort = 'DisplayOrder';

  ngOnInit() {
    this.api.getCategoryTree().subscribe({
      next: tree => this.categoryTree = tree,
      error: () => {}
    });

    this.route.queryParamMap.subscribe(params => {
      this.page = Number(params.get('page') ?? 1) || 1;
      this.activeCategoryId = params.has('categoryId') ? Number(params.get('categoryId')) : null;
      this.sort = params.get('sort') ?? 'DisplayOrder';
      this.loadProducts();
    });
  }

  loadProducts() {
    this.loading = true;
    this.error = null;
    this.api.getProducts({
      page: this.page,
      pageSize: this.pageSize,
      categoryId: this.activeCategoryId,
      sort: this.sort
    }).subscribe({
      next: result => {
        this.products = result.items.map(toProductCard);
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load products.';
        this.loading = false;
      }
    });
  }

  selectCategory(id: number | null) {
    this.router.navigate([], { queryParams: { categoryId: id ?? undefined, page: 1, sort: this.sort }, queryParamsHandling: 'merge' });
  }

  onSearch(query: string) {
    this.router.navigate(['/storefront/products'], { queryParams: { search: query || undefined, page: 1 } });
  }

  onSortChange() {
    this.router.navigate([], { queryParams: { sort: this.sort, page: 1 }, queryParamsHandling: 'merge' });
  }

  goToPage(p: number) {
    this.router.navigate([], { queryParams: { page: p }, queryParamsHandling: 'merge' });
  }
}

const BLANK_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23e4e8df'/%3E%3C/svg%3E`;

function toProductCard(p: ProductResponse): ProductCardModel {
  return {
    id: p.id,
    name: p.name,
    category: '',
    price: formatPrice(p.price),
    compareAtPrice: p.oldPrice > 0 ? formatPrice(p.oldPrice) : undefined,
    imageUrl: BLANK_IMAGE,
    rating: undefined,
    reviewCount: undefined
  };
}

function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}
