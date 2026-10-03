import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { MediaApiService } from '../../core/media/media-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ProductResponse } from '../../core/catalog/catalog.models';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, RouterLink, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    @if (loading) {
      <p class="state">{{ t('storefront.vendorDetail.loading') }}</p>
    }
    @if (error) {
      <p class="state state-error" role="alert">{{ t(error) }}</p>
    }
    @if (!loading && !error && vendor) {
      <div class="page-heading">
        <app-breadcrumb [items]="[
          { label: t('storefront.vendors.title'), url: '/storefront/vendors' },
          { label: vendor.name }
        ]" />
      </div>

      <div class="vendor-layout">
        <aside class="vendor-aside">
          @if (logoUrl(vendor.pictureId); as logo) {
            <img class="vendor-avatar" [src]="logo" [alt]="t('storefront.vendors.logoAlt', { name: vendor.name })" />
          } @else {
            <div class="vendor-avatar" aria-hidden="true">{{ initial(vendor.name) }}</div>
          }
        </aside>

        <div class="vendor-body">
          <div class="eyebrow">{{ t('storefront.vendorDetail.eyebrow') }}</div>
          <h1>{{ vendor.name }}</h1>
          <a [href]="'mailto:' + vendor.email" class="vendor-email">{{ vendor.email }}</a>

          @if (vendor.description) {
            <div class="vendor-desc">
              <p>{{ vendor.description }}</p>
            </div>
          }

          <div class="vendor-products">
            <h2>{{ t('storefront.products.breadcrumb') }}</h2>
            @if (productsLoading) {
              <p class="muted">{{ t('storefront.products.loading') }}</p>
            } @else if (productsError) {
              <p class="state-error" role="alert">{{ t(productsError) }}</p>
            } @else if (products.length === 0) {
              <p class="muted">{{ t('storefront.vendorDetail.noProducts') }}</p>
            } @else {
              <ul class="product-list" role="list">
                @for (p of products; track p.id) {
                  <li><a [routerLink]="['/storefront/products', p.id]">{{ p.name }}</a><span>{{ price(p.price) }}</span></li>
                }
              </ul>
            }
          </div>
        </div>
      </div>
    }
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .vendor-products { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line); }
    .vendor-products h2 { font-size: 1.1rem; margin: 0 0 .75rem; }
    .product-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .4rem; }
    .product-list li { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--line); padding: .4rem 0; }
    .product-list a { color: var(--ink); text-decoration: none; }
    .product-list a:hover { color: var(--green); }
    .muted { color: var(--muted); }

    .state { padding: 3rem 2rem; color: var(--muted); }
    .state-error { color: #d32f2f; }

    .page-heading { padding: 1.5rem var(--page-gutter, 2rem) 0; }

    .vendor-layout {
      display: flex;
      gap: 2.5rem;
      padding: 2rem var(--page-gutter, 2rem);
      max-width: 860px;
    }

    .vendor-aside { flex-shrink: 0; }

    .vendor-avatar {
      object-fit: cover;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--green) 15%, var(--paper));
      color: var(--green);
      font-family: var(--display-font);
      font-size: 2.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--line);
    }

    .vendor-body { flex: 1; }

    .eyebrow {
      font-family: var(--mono-font);
      font-size: .75rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: .4rem;
    }

    h1 { font-family: var(--display-font); font-size: 2rem; margin: 0 0 .3rem; }

    .vendor-email {
      color: var(--green);
      font-size: .9rem;
      text-decoration: none;
    }
    .vendor-email:hover { text-decoration: underline; }

    .vendor-desc {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.65;
    }
    .vendor-desc p { margin: 0; }

    @media (max-width: 600px) {
      .vendor-layout { flex-direction: column; }
    }
  `]
})
export class VendorDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(VendorApiService);
  private readonly catalog = inject(CatalogApiService);
  private readonly media = inject(MediaApiService);
  private readonly currency = inject(CurrencyService);

  vendor: VendorResponse | null = null;
  loading = false;
  error = '';
  products: ProductResponse[] = [];
  productsLoading = false;
  productsError = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error = 'storefront.vendorDetail.invalid'; return; }
    this.loading = true;
    this.api.getVendor(id).subscribe({
      next: v => { this.vendor = v; this.loading = false; this.loadProducts(v.id); },
      error: err => {
        this.loading = false;
        this.error = err?.status === 404 ? 'storefront.vendorDetail.notFound' : 'storefront.vendorDetail.loadError';
      }
    });
  }

  price(value: number) { return this.currency.format(value); }

  private loadProducts(vendorId: number) {
    this.productsLoading = true;
    this.productsError = '';
    this.catalog.getProducts({ vendorId, pageSize: 24 }).subscribe({
      next: r => { this.products = r.items; this.productsLoading = false; },
      error: () => { this.productsLoading = false; this.productsError = 'storefront.products.loadError'; }
    });
  }

  logoUrl(pictureId: number) { return this.media.url(pictureId); }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
