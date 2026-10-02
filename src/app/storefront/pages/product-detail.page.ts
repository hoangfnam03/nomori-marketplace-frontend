import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { PriceQuote, ProductDetailResponse, TierPrice } from '../../core/catalog/catalog.models';
import { PublicAttributeCombination, PublicAttributeDetail } from '../../core/catalog/product-attribute.models';
import { ProductSpecDetail, ProductTag } from '../../core/catalog/spec-attribute.models';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, FormsModule, RouterLink],
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
          @if (selectedPictureUrl(); as url) {
            <img class="product-image" [src]="url" [alt]="detail.product.name" />
            @if (detail.pictureIds.length > 1) {
              <div class="thumbs">
                @for (id of detail.pictureIds; track id) {
                  <button type="button" class="thumb" [class.active]="id === selectedPictureId" (click)="selectedPictureId = id" [attr.aria-label]="'Show picture ' + ($index + 1)">
                    <img [src]="media.url(id)" alt="" loading="lazy" />
                  </button>
                }
              </div>
            }
          } @else {
            <div class="product-image-placeholder" aria-hidden="true"></div>
          }
        </div>

        <div class="product-info">
          @if (detail.categories.length > 0) {
            <div class="eyebrow">{{ detail.categories[0].name }}</div>
          }
          <h1>{{ detail.product.name }}</h1>
          @if (detail.product.vendorName) {
            <p class="sold-by">Sold by <a [routerLink]="['/storefront/vendors', detail.product.vendorId]">{{ detail.product.vendorName }}</a></p>
          }

          <div class="price-row">
            <span class="price">{{ formatPrice(unitPrice()) }}</span>
            @if (comparePrice(); as compare) {
              <span class="compare-price">{{ formatPrice(compare) }}</span>
            }
            @if (quote?.appliedRule === 'special' || (!quote && detail.product.onSale)) { <span class="sale-tag">Sale</span> }
          </div>
          @if (quoteError) { <p class="quote-error" role="alert">{{ quoteError }}</p> }

          @if (detail.tierPrices.length > 0) {
            <table class="tiers" aria-label="Quantity prices">
              <caption>Buy more, pay less</caption>
              <tbody>
                @for (t of detail.tierPrices; track t.quantity) {
                  <tr [class.active]="activeTier()?.quantity === t.quantity">
                    <th scope="row">{{ t.quantity }}+ units</th>
                    <td>{{ formatPrice(t.price) }} each</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          @if (detail.product.shortDescription) {
            <p class="short-desc">{{ detail.product.shortDescription }}</p>
          }

          <div class="stock-info">
            @if (needsChoice()) {
              <span class="muted-note">Choose {{ missingChoices() }} to see price and availability.</span>
            } @else if (currentStock() > 0) {
              <span class="in-stock">In stock@if (detail.trackInventory) { · {{ currentStock() }} available }</span>
            } @else {
              <span class="out-of-stock">Out of stock</span>
            }
            @if (combination()?.sku; as sku) { <span class="sku"> · SKU {{ sku }}</span> }
          </div>

          @if (attrs && attrs.mappings.length > 0) {
            <div class="attrs-section">
              @for (m of attrs.mappings; track m.id) {
                <div class="attr-group">
                  <div class="attr-label">{{ m.prompt || m.attribute.name }}@if (m.isRequired) { <span aria-hidden="true"> *</span> }</div>
                  @if (m.controlType === 'ColorSquares') {
                    <div class="attr-swatches" role="group" [attr.aria-label]="m.attribute.name">
                      @for (v of m.values; track v.id) {
                        <button type="button" class="swatch" [class.selected]="selected[m.id] === v.id" [attr.aria-pressed]="selected[m.id] === v.id"
                          [style.background]="v.colorSquaresRgb || '#ccc'" [title]="v.name" [attr.aria-label]="v.name" (click)="choose(m.id, v.id)"></button>
                      }
                    </div>
                  } @else {
                    <div class="attr-options" role="group" [attr.aria-label]="m.attribute.name">
                      @for (v of m.values; track v.id) {
                        <button type="button" class="attr-option" [class.selected]="selected[m.id] === v.id" [attr.aria-pressed]="selected[m.id] === v.id" (click)="choose(m.id, v.id)">
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

          <div class="quantity-row">
            <label for="quantity">Quantity</label>
            <input id="quantity" type="number" name="quantity" min="1" max="10000" step="1" [(ngModel)]="quantity" (ngModelChange)="onQuantityChange()" />
            @if (quote && !needsChoice()) { <span class="line-total">Total {{ formatPrice(quote.lineTotal) }}</span> }
          </div>

          <button type="button" class="add-to-cart" [disabled]="needsChoice() || currentStock() === 0">Add to cart</button>

          @if (detail.fullDescription) {
            <div class="full-desc">
              <div class="section-label">Description</div>
              <!-- Sanitized by the API on save; Angular sanitizes again when binding. -->
              <div class="rich" [innerHTML]="detail.fullDescription"></div>
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

      @if (detail.relatedProducts.length > 0) {
        <section class="related" aria-labelledby="related-title">
          <h2 id="related-title" class="specs-title">Related products</h2>
          <div class="related-grid">
            @for (r of detail.relatedProducts; track r.id) {
              <a class="related-card" [routerLink]="['/storefront/products', r.id]">
                @if (media.url(r.mainPictureId); as url) { <img [src]="url" alt="" loading="lazy" /> }
                @else { <span class="related-empty" aria-hidden="true"></span> }
                <span class="related-name">{{ r.name }}</span>
                <span class="related-price">{{ formatPrice(r.finalPrice) }}</span>
              </a>
            }
          </div>
        </section>
      }

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
    .sold-by { margin: .2rem 0 1rem; color: var(--muted); font-size: .9rem; }
    .sold-by a { color: var(--green); }
    :host { display: block; }
    .page-heading { padding: .75rem 0 2rem; animation: rise-in 600ms ease both; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; padding-bottom: 5rem; }
    .product-image-placeholder { aspect-ratio: 4/5; background: #e4e8df; }
    .product-image { display: block; width: 100%; aspect-ratio: 4/5; object-fit: cover; background: #e4e8df; }
    .thumbs { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .6rem; }
    .thumb { width: 64px; height: 64px; padding: 0; border: 1px solid var(--line); background: transparent; cursor: pointer; }
    .thumb.active { border-color: var(--green); outline: 2px solid var(--green); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
    .swatch.selected { border-color: var(--ink); outline: 2px solid var(--ink); outline-offset: 2px; }
    .muted-note, .sku { color: var(--muted); }
    .sale-tag { align-self: center; padding: .2rem .5rem; background: var(--green); color: var(--paper); font: 700 .65rem var(--mono-font); letter-spacing: .08em; text-transform: uppercase; }
    .quote-error { color: #8d3128; font-size: .85rem; margin: 0 0 1rem; }
    .tiers { border-collapse: collapse; margin: 0 0 1.25rem; font-size: .85rem; }
    .tiers caption { text-align: left; color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .1em; text-transform: uppercase; padding-bottom: .4rem; }
    .tiers th { text-align: left; font-weight: 500; padding: .25rem 1.5rem .25rem 0; color: var(--muted); }
    .tiers tr.active th, .tiers tr.active td { color: var(--ink); font-weight: 700; }
    .quantity-row { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
    .quantity-row label { font: 700 .68rem var(--mono-font); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    .quantity-row input { width: 5.5rem; border: 1px solid var(--line-strong); padding: .5rem .6rem; background: transparent; color: var(--ink); font: inherit; }
    .line-total { color: var(--muted); font: .78rem var(--mono-font); }
    .full-desc { border-top: 1px solid var(--line); padding-top: 1.5rem; margin-top: 1.5rem; }
    .section-label { color: var(--muted); font: 700 .68rem var(--mono-font); letter-spacing: .12em; text-transform: uppercase; margin-bottom: .6rem; }
    .full-desc p { color: var(--muted); font-size: .95rem; line-height: 1.75; margin: 0; }
    .rich { color: var(--muted); font-size: .95rem; line-height: 1.75; }
    .rich p { margin: 0 0 .8rem; }
    .rich a { color: var(--green); }
    .related { border-top: 1px solid var(--line); padding: 2.5rem 0 3rem; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.25rem; }
    .related-card { display: grid; gap: .4rem; color: inherit; text-decoration: none; }
    .related-card img, .related-empty { width: 100%; aspect-ratio: 4/5; object-fit: cover; background: #e4e8df; display: block; }
    .related-name { font-weight: 600; font-size: .9rem; }
    .related-price { color: var(--muted); font-size: .85rem; }
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
  readonly media = inject(MediaApiService);
  private readonly currency = inject(CurrencyService);

  detail: ProductDetailResponse | null = null;
  attrs: PublicAttributeDetail | null = null;
  /** Chosen value id per attribute mapping id. */
  selected: Record<number, number> = {};
  quantity = 1;
  /** The server's price for the current choice; null until it answers or while a choice is missing. */
  quote: PriceQuote | null = null;
  quoteError = '';
  private quoteRequest = 0;
  specs: ProductSpecDetail | null = null;
  tags: ProductTag[] = [];
  loading = true;
  error: string | null = null;
  selectedPictureId = 0;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getProduct(id).subscribe({
      next: detail => {
        this.detail = detail;
        this.selectedPictureId = detail.pictureIds[0] ?? 0;
        this.loading = false;
        this.api.getProductAttributes(id).subscribe({ next: a => { this.attrs = a; this.preselect(a); this.refreshQuote(); }, error: () => {} });
        this.refreshQuote();
        this.api.getProductSpecs(id).subscribe({ next: s => { this.specs = s; }, error: () => {} });
        this.api.getProductTags(id).subscribe({ next: t => { this.tags = t; }, error: () => {} });
      },
      error: err => {
        this.error = err.status === 404 ? 'Product not found.' : 'Unable to load product.';
        this.loading = false;
      }
    });
  }

  private preselect(attrs: PublicAttributeDetail) {
    this.selected = {};
    for (const m of attrs.mappings) {
      const first = m.values.find(v => v.isPreSelected);
      if (first) this.selected[m.id] = first.id;
    }
  }

  choose(mappingId: number, valueId: number) {
    this.selected = { ...this.selected, [mappingId]: valueId };
    this.refreshQuote();
  }

  onQuantityChange() {
    const value = Number(this.quantity);
    // Only a whole quantity in range is asked about; anything else keeps the last good price on screen.
    if (!Number.isInteger(value) || value < 1 || value > 10000) { this.quoteError = 'Enter a quantity between 1 and 10,000.'; return; }
    this.quantity = value;
    this.refreshQuote();
  }

  /** Asks the server for the price of this quantity and choice. Only the newest answer is used. */
  private refreshQuote() {
    if (!this.detail) return;
    this.quoteError = '';
    if (this.needsChoice()) { this.quote = null; return; }

    const request = ++this.quoteRequest;
    this.api.getPriceQuote(this.detail.product.id, this.quantity, Object.values(this.selected)).subscribe({
      next: quote => { if (request === this.quoteRequest) this.quote = quote; },
      error: err => {
        if (request !== this.quoteRequest) return;
        this.quote = null;
        this.quoteError = err?.status === 400 && err?.fieldErrors
          ? Object.values(err.fieldErrors as Record<string, string[]>).flat().join(' ')
          : 'Unable to get the price. Try again.';
      }
    });
  }

  /** Price of one unit: the server's quote, or the product's current price until it arrives. */
  unitPrice(): number { return this.quote?.unitPrice ?? this.detail?.product.finalPrice ?? 0; }

  /** The price to strike through. */
  comparePrice(): number | null {
    if (this.quote) return this.quote.comparePrice;
    const p = this.detail?.product;
    if (!p) return null;
    return p.onSale ? p.price : p.oldPrice > 0 ? p.oldPrice : null;
  }

  /** The tier step the current quantity reaches, to highlight it in the table. */
  activeTier(): TierPrice | null {
    return [...(this.detail?.tierPrices ?? [])].filter(t => t.quantity <= this.quantity).sort((a, b) => b.quantity - a.quantity)[0] ?? null;
  }

  /** The product has variants and the customer has not chosen a value for every attribute yet. */
  needsChoice(): boolean {
    return !!this.attrs && this.attrs.combinations.length > 0 && this.attrs.mappings.some(m => this.selected[m.id] === undefined);
  }

  missingChoices(): string {
    return (this.attrs?.mappings ?? []).filter(m => this.selected[m.id] === undefined).map(m => m.prompt || m.attribute.name).join(', ');
  }

  /** The combination that matches every chosen value, if there is one. */
  combination(): PublicAttributeCombination | null {
    if (!this.attrs || this.attrs.combinations.length === 0 || this.needsChoice()) return null;
    return this.attrs.combinations.find(c => {
      try {
        const key = JSON.parse(c.attributesJson) as Record<string, number>;
        return this.attrs!.mappings.every(m => key[String(m.id)] === this.selected[m.id]);
      } catch { return false; }
    }) ?? null;
  }

  currentStock(): number {
    // Products without a stock limit are always available, whatever the stored numbers say.
    if (this.detail && !this.detail.trackInventory) return Number.MAX_SAFE_INTEGER;
    if (this.attrs && this.attrs.combinations.length > 0) return this.combination()?.stockQuantity ?? 0;
    return this.detail?.availableQuantity ?? this.detail?.product.stockQuantity ?? 0;
  }

  selectedPictureUrl() { return this.media.url(this.selectedPictureId); }

  formatPrice(price: number): string {
    return this.currency.format(price);
  }

  categoryNames(detail: ProductDetailResponse): string {
    return detail.categories.map(c => c.name).join(', ');
  }
}
