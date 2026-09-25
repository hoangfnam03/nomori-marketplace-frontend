import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ProductDetailResponse } from '../../core/catalog/catalog.models';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, RouterLink],
  template: `
    @if (loading) {
      <p class="state">Loading product...</p>
    }
    @if (error) {
      <p class="state state-error" role="alert">{{ error }}</p>
    }
    @if (!loading && !error && detail) {
      <div class="page-heading">
        <app-breadcrumb [items]="[
          { label: 'Products', url: '/storefront/products' },
          { label: detail.product.name }
        ]" />
      </div>

      <div class="product-layout">
        <div class="product-image-area">
          <div class="product-image-placeholder" aria-hidden="true"></div>
        </div>

        <div class="product-info">
          @if (detail.categories.length > 0) {
            <div class="eyebrow">{{ detail.categories[0].name }}</div>
          }
          <h1>{{ detail.product.name }}</h1>

          <div class="price-row">
            <span class="price">{{ formatPrice(detail.product.price) }}</span>
            @if (detail.product.oldPrice > 0) {
              <span class="compare-price">{{ formatPrice(detail.product.oldPrice) }}</span>
            }
          </div>

          @if (detail.product.shortDescription) {
            <p class="short-desc">{{ detail.product.shortDescription }}</p>
          }

          <div class="stock-info">
            @if (detail.product.stockQuantity > 0) {
              <span class="in-stock">In stock · {{ detail.product.stockQuantity }} available</span>
            } @else {
              <span class="out-of-stock">Out of stock</span>
            }
          </div>

          <button type="button" class="add-to-cart" [disabled]="detail.product.stockQuantity === 0">Add to cart</button>

          @if (detail.fullDescription) {
            <div class="full-desc">
              <div class="section-label">Description</div>
              <p>{{ detail.fullDescription }}</p>
            </div>
          }

          @if (detail.manufacturers.length > 0) {
            <div class="meta-section">
              <span class="meta-label">Brand</span>
              <span>{{ detail.manufacturers[0].name }}</span>
            </div>
          }

          @if (detail.categories.length > 0) {
            <div class="meta-section">
              <span class="meta-label">Categories</span>
              <span>{{ categoryNames(detail) }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-heading { padding: .75rem 0 2rem; animation: rise-in 600ms ease both; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; padding-bottom: 5rem; }
    .product-image-placeholder { aspect-ratio: 4/5; background: #e4e8df; }
    .product-info { padding-top: 1rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; margin-bottom: .75rem; }
    h1 { margin: 0 0 1.5rem; font: 700 clamp(2rem, 4vw, 3.5rem)/1.08 var(--display-font); }
    .price-row { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.25rem; }
    .price { font: 700 1.6rem/1 var(--display-font); }
    .compare-price { color: var(--muted); font-size: 1.1rem; text-decoration: line-through; }
    .short-desc { color: var(--muted); font-size: 1rem; line-height: 1.7; max-width: 480px; margin: 0 0 1.5rem; }
    .stock-info { margin-bottom: 1.5rem; font: .78rem var(--mono-font); }
    .in-stock { color: var(--green); }
    .out-of-stock { color: #8d3128; }
    .add-to-cart { width: 100%; padding: 1rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); font: 700 1rem/1 inherit; cursor: pointer; letter-spacing: .04em; margin-bottom: 2rem; }
    .add-to-cart:disabled { opacity: .4; cursor: not-allowed; }
    .full-desc { border-top: 1px solid var(--line); padding-top: 1.5rem; margin-top: 1.5rem; }
    .section-label { color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .12em; text-transform: uppercase; margin-bottom: .6rem; }
    .full-desc p { color: var(--muted); font-size: .95rem; line-height: 1.75; margin: 0; }
    .meta-section { display: flex; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--line); font-size: .9rem; }
    .meta-label { flex: 0 0 100px; color: var(--muted); font: .72rem var(--mono-font); text-transform: uppercase; padding-top: .1em; }
    .state { color: var(--muted); padding: 3rem 0; }
    .state-error { color: #8d3128; }
    @media (max-width: 760px) { .product-layout { grid-template-columns: 1fr; gap: 2rem; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductDetailPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);

  detail: ProductDetailResponse | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getProduct(id).subscribe({
      next: detail => { this.detail = detail; this.loading = false; },
      error: err => {
        this.error = err.status === 404 ? 'Product not found.' : 'Unable to load product.';
        this.loading = false;
      }
    });
  }

  formatPrice(price: number): string {
    return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
  }

  categoryNames(detail: ProductDetailResponse): string {
    return detail.categories.map(c => c.name).join(', ');
  }
}
