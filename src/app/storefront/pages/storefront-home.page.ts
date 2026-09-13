import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { ProductCardModel } from '../../shared/models/product-card.model';

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
        <button type="button" class="filter-button">Filters <span aria-hidden="true">+</span></button>
        <label>Sort <select aria-label="Sort products"><option>Featured</option><option>Price: low to high</option><option>Newest</option></select></label>
      </div>
    </section>

    @if (searchQuery) {
      <div class="search-feedback" role="status">Showing the component state for <strong>{{ searchQuery }}</strong>. The feature facade will connect this control to the API.</div>
    }

    <section class="product-grid" aria-label="Featured products">
      @for (product of products; track product.id) {
        <app-product-card [product]="product" (addToCart)="onAddToCart($event)" />
      }
    </section>

    <section class="next-pattern" aria-labelledby="next-pattern-title">
      <div><div class="eyebrow">Next shared pattern</div><h2 id="next-pattern-title">Every state gets a place.</h2></div>
      <app-empty-state title="Cart and checkout ready to compose" message="Cart summary, checkout steps, form feedback and order confirmation will be added by their feature teams." mark="02" />
    </section>

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
  readonly products: ProductCardModel[] = [
    { id: 1, name: 'Ridge ceramic set', category: 'Table / Objects', price: '$68', compareAtPrice: '$84', imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80', rating: 5, reviewCount: 24, badge: 'New' },
    { id: 2, name: 'Field canvas tote', category: 'Carry / Everyday', price: '$42', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80', rating: 4, reviewCount: 18 },
    { id: 3, name: 'Still life lamp', category: 'Home / Light', price: '$126', imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', rating: 5, reviewCount: 31, badge: 'Limited' },
    { id: 4, name: 'Archive wool throw', category: 'Home / Textile', price: '$95', imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80', rating: 4, reviewCount: 12 }
  ];
  searchQuery = '';
  lastAddedProduct?: ProductCardModel;

  onSearch(query: string) {
    this.searchQuery = query;
  }

  onAddToCart(product: ProductCardModel) {
    this.lastAddedProduct = product;
  }
}
