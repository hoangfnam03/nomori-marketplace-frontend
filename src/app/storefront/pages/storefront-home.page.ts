import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { ProductCardModel } from '../../shared/models/product-card.model';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ProductResponse } from '../../core/catalog/catalog.models';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, EmptyStateComponent, ProductCardComponent, RouterLink, SearchBoxComponent],
  template: `
    <div class="page-heading">
      <app-breadcrumb [items]="[{ label: 'Featured collection' }]" />
      <div class="heading-row">
        <div>
          <div class="eyebrow">Storefront / Component specimen</div>
          <h1>Objects with a point of view.</h1>
          <p class="lede">The marketplace surface is ready for catalog data. Search, filters, cards, pricing, reviews and cart actions have a shared home.</p>
        </div>
        <app-search-box (searched)="onSearch($event)" />
      </div>
    </div>

    <section class="catalog-toolbar" aria-label="Catalog controls">
      <span>{{ products.length }} featured items</span>
      <div class="toolbar-actions">
        <a routerLink="/storefront/products" class="filter-button">Browse all <span aria-hidden="true">→</span></a>
      </div>
    </section>

    @if (loading) { <p class="state">Loading featured products...</p> }
    @if (error) { <p class="state state-error" role="alert">{{ error }}</p> }

    <section class="product-grid" aria-label="Featured products">
      @for (product of products; track product.id) {
        <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
      }
    </section>

    @if (!loading && products.length === 0 && !error) {
      <section class="next-pattern" aria-labelledby="next-pattern-title">
        <div><div class="eyebrow">Get started</div><h2 id="next-pattern-title">No featured products yet.</h2></div>
        <app-empty-state title="Add products in the admin panel" message="Create categories, manufacturers and products in the admin catalog, then mark them as featured to display them here." mark="00" />
      </section>
    }

    @if (lastAddedProduct) {
      <div class="toast" role="status">{{ lastAddedProduct.name }} is ready for the cart facade.</div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading { padding: 1rem 0 3.5rem; animation: rise-in 600ms ease both; }
    .heading-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 420px); gap: 2rem; align-items: end; margin-top: 2.5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 1rem 0; font: 700 clamp(3rem, 7vw, 6.5rem)/.94 var(--display-font); }
    .lede { max-width: 610px; margin: 0; color: var(--muted); font-size: 1.05rem; line-height: 1.7; }
    .catalog-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .9rem 0; border-top: 1px solid var(--line-strong); border-bottom: 1px solid var(--line); color: var(--muted); font: 500 .72rem var(--mono-font); letter-spacing: .06em; text-transform: uppercase; }
    .toolbar-actions { display: flex; align-items: center; gap: 1rem; }
    .filter-button, select { border: 1px solid var(--line-strong); padding: .55rem .7rem; background: transparent; color: var(--ink); font: inherit; cursor: pointer; }
    .filter-button span { margin-left: .5rem; color: var(--green); }
    select { margin-left: .4rem; }
    .search-feedback { margin: 1.25rem 0 0; padding: .9rem 1rem; border-left: 3px solid var(--green); background: rgba(39,116,93,.08); color: var(--muted); }
    .product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; padding: 1rem 0 5rem; }
    .next-pattern { display: grid; grid-template-columns: 1fr minmax(320px, 1fr); gap: 2rem; align-items: start; padding: 2rem 0 4rem; border-top: 1px solid var(--line); }
    .next-pattern h2 { margin: 1rem 0 0; font: 700 clamp(2rem, 4vw, 4rem)/1 var(--display-font); }
    .toast { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 10; max-width: 330px; padding: .9rem 1rem; border: 1px solid var(--green); background: var(--ink); color: var(--paper); box-shadow: 0 12px 30px rgba(31,37,32,.16); }
    @media (max-width: 1000px) { .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .heading-row, .next-pattern { grid-template-columns: 1fr; } .catalog-toolbar { align-items: flex-start; flex-direction: column; } .toolbar-actions { width: 100%; justify-content: space-between; } }
    @media (max-width: 520px) { .product-grid { grid-template-columns: 1fr; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StorefrontHomePage {
  private readonly api = inject(CatalogApiService);
  private readonly router = inject(Router);

  products: ProductCardModel[] = [];
  loading = true;
  error: string | null = null;
  lastAddedProduct?: ProductCardModel;

  constructor() {
    this.api.getProducts({ pageSize: 8, sort: 'DisplayOrder' }).subscribe({
      next: result => {
        this.products = result.items
          .filter(p => p.showOnHomepage)
          .slice(0, 8)
          .map(toProductCard);
        if (this.products.length === 0) {
          this.products = result.items.slice(0, 4).map(toProductCard);
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load featured products.';
        this.loading = false;
      }
    });
  }

  onSearch(query: string) {
    this.router.navigate(['/storefront/products'], { queryParams: { search: query || undefined } });
  }

  onAddToCart(product: ProductCardModel) {
    this.lastAddedProduct = product;
  }
}

const BLANK_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23e4e8df'/%3E%3C/svg%3E`;

function toProductCard(p: ProductResponse): ProductCardModel {
  return {
    id: p.id,
    name: p.name,
    category: '',
    price: p.price % 1 === 0 ? `$${p.price}` : `$${p.price.toFixed(2)}`,
    compareAtPrice: p.oldPrice > 0 ? (p.oldPrice % 1 === 0 ? `$${p.oldPrice}` : `$${p.oldPrice.toFixed(2)}`) : undefined,
    imageUrl: BLANK_IMAGE,
    rating: undefined,
    reviewCount: undefined
  };
}
