import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ProductDetailResponse } from '../../core/catalog/catalog.models';
import { ProductAttributeDetail } from '../../core/catalog/product-attribute.models';
import { ProductSpecDetail, ProductTag } from '../../core/catalog/spec-attribute.models';

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

          @if (attrs && attrs.mappings.length > 0) {
            <div class="attrs-section">
              @for (m of attrs.mappings; track m.mapping.id) {
                <div class="attr-group">
                  <div class="attr-label">{{ m.prompt || m.attribute.name }}</div>
                  @if (m.controlType === 'ColorSquares') {
                    <div class="attr-swatches" role="group" [attr.aria-label]="m.attribute.name">
                      @for (v of m.values; track v.id) {
                        <button type="button" class="swatch" [style.background]="v.colorSquaresRgb || '#ccc'" [title]="v.name" [attr.aria-label]="v.name"></button>
                      }
                    </div>
                  } @else {
                    <div class="attr-options" role="group" [attr.aria-label]="m.attribute.name">
                      @for (v of m.values; track v.id) {
                        <button type="button" class="attr-option" [class.selected]="v.isPreSelected">
                          {{ v.name }}
                          @if (v.priceAdjustment !== 0) { <span class="adj">{{ v.priceAdjustment > 0 ? '+' : '' }}{{ formatPrice(v.priceAdjustment) }}</span> }
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

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

          @if (tags.length > 0) {
            <div class="tags-section">
              @for (t of tags; track t.id) {
                <span class="tag">{{ t.name }}</span>
              }
            </div>
          }
        </div>
      </div>

      @if (specs && (specs.groups.length > 0 || specs.ungrouped.length > 0)) {
        <div class="specs-section">
          <h2 class="specs-title">Specifications</h2>

          @if (specs.ungrouped.length > 0) {
            <table class="specs-table">
              <tbody>
                @for (row of specs.ungrouped; track row.mapping.id) {
                  <tr>
                    <th>{{ row.specAttribute.name }}</th>
                    <td>
                      @if (row.colorSquaresRgb) {
                        <span class="spec-dot" [style.background]="row.colorSquaresRgb"></span>
                      }
                      {{ row.displayValue }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }

          @for (sg of specs.groups; track sg.group.id) {
            <h3 class="spec-group-name">{{ sg.group.name }}</h3>
            <table class="specs-table">
              <tbody>
                @for (row of sg.rows; track row.mapping.id) {
                  <tr>
                    <th>{{ row.specAttribute.name }}</th>
                    <td>
                      @if (row.colorSquaresRgb) {
                        <span class="spec-dot" [style.background]="row.colorSquaresRgb"></span>
                      }
                      {{ row.displayValue }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
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
    .attrs-section { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .attr-group {}
    .attr-label { font: 700 .68rem var(--mono-font); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: .5rem; }
    .attr-options { display: flex; flex-wrap: wrap; gap: .5rem; }
    .attr-option { border: 1px solid var(--line); border-radius: 4px; padding: .35rem .75rem; font-size: .85rem; background: var(--paper); color: var(--ink); cursor: pointer; transition: border-color .12s; }
    .attr-option:hover { border-color: var(--ink); }
    .attr-option.selected { border-color: var(--ink); background: var(--ink); color: var(--paper); }
    .adj { font-size: .75rem; margin-left: .3rem; opacity: .7; }
    .attr-swatches { display: flex; flex-wrap: wrap; gap: .5rem; }
    .swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line); cursor: pointer; }
    .swatch:hover { border-color: var(--ink); }
    .full-desc { border-top: 1px solid var(--line); padding-top: 1.5rem; margin-top: 1.5rem; }
    .section-label { color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .12em; text-transform: uppercase; margin-bottom: .6rem; }
    .full-desc p { color: var(--muted); font-size: .95rem; line-height: 1.75; margin: 0; }
    .meta-section { display: flex; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--line); font-size: .9rem; }
    .meta-label { flex: 0 0 100px; color: var(--muted); font: .72rem var(--mono-font); text-transform: uppercase; padding-top: .1em; }
    .state { color: var(--muted); padding: 3rem 0; }
    .state-error { color: #8d3128; }
    .tags-section { display: flex; flex-wrap: wrap; gap: .4rem; padding-top: 1.25rem; }
    .tag { font: .72rem var(--mono-font); letter-spacing: .06em; text-transform: lowercase; border: 1px solid var(--line); padding: .2rem .6rem; color: var(--muted); }
    .specs-section { border-top: 1px solid var(--line); padding: 2.5rem 0 3rem; }
    .specs-title { font: 700 1.25rem/1 var(--display-font); margin: 0 0 1.5rem; }
    .spec-group-name { font: 600 .85rem var(--mono-font); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin: 1.5rem 0 .5rem; }
    .specs-table { width: 100%; border-collapse: collapse; font-size: .875rem; max-width: 680px; }
    .specs-table th { text-align: left; font-weight: 600; width: 220px; padding: .6rem .75rem .6rem 0; border-bottom: 1px solid var(--line); color: var(--muted); vertical-align: top; }
    .specs-table td { padding: .6rem 0; border-bottom: 1px solid var(--line); vertical-align: top; }
    .spec-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: .4rem; border: 1px solid var(--line); }
    @media (max-width: 760px) { .product-layout { grid-template-columns: 1fr; gap: 2rem; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProductDetailPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);

  detail: ProductDetailResponse | null = null;
  attrs: ProductAttributeDetail | null = null;
  specs: ProductSpecDetail | null = null;
  tags: ProductTag[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getProduct(id).subscribe({
      next: detail => {
        this.detail = detail;
        this.loading = false;
        this.api.getProductAttributes(id).subscribe({ next: a => { this.attrs = a; }, error: () => {} });
        this.api.getProductSpecs(id).subscribe({ next: s => { this.specs = s; }, error: () => {} });
        this.api.getProductTags(id).subscribe({ next: t => { this.tags = t; }, error: () => {} });
      },
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
