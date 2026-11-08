import { Location } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { MediaApiService } from '../../core/media/media-api.service';
import { describe, keyFor, parseKey, vendorPath, VENDORS_PATH } from '../../core/seo/seo-paths';
import { SeoService } from '../../core/seo/seo.service';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorResponse } from '../../core/vendors/vendor.models';
import { ProductListPage } from './product-list.page';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, ProductListPage, TranslocoDirective],
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
        </div>
      </div>

      <!-- The shop's products, with the same filters, sort and cards as the products page. -->
      <app-product-catalog [vendorId]="vendor.id" [vendorName]="vendor.name" />
    }
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .state { padding: 3rem 2rem; color: var(--muted); }
    .state-error { color: #d32f2f; }

    .page-heading { padding: 1rem 0 0; }

    /* The shop's card sits above its catalog, like the heading of the products page. */
    .vendor-layout {
      display: flex;
      gap: 2.5rem;
      padding: 2.5rem 0 3rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--line-strong);
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

    .vendor-body { flex: 1; max-width: 760px; }

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
  private readonly media = inject(MediaApiService);
  private readonly seo = inject(SeoService);
  private readonly location = inject(Location);

  vendor: VendorResponse | null = null;
  loading = false;
  error = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => this.load(params.get('key')));
  }

  private load(key: string | null) {
    const id = parseKey(key);
    this.error = '';
    // The same shop again (a filter changed the address) keeps the page; only another shop starts over.
    if (id && this.vendor?.id === id) return;
    this.vendor = null;
    if (!id) { this.error = 'storefront.vendorDetail.invalid'; return; }
    this.loading = true;
    this.api.getVendor(id).subscribe({
      next: v => {
        this.vendor = v;
        this.loading = false;
        // An old name or a bare id opens the page; the address is replaced by the canonical one.
        const canonical = keyFor(v.id, v.slug);
        // The filters in the query stay.
        if (key !== canonical) this.location.replaceState(`${VENDORS_PATH}/${canonical}`, this.location.path().split('?')[1] ?? '');
        const logo = this.media.url(v.pictureId) ?? undefined;
        const description = describe(v.description);
        this.seo.set({
          title: v.name,
          description,
          path: vendorPath(v.id, v.slug),
          image: logo,
          type: 'profile',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: v.name,
            description: description || undefined,
            logo: logo ? this.seo.absolute(logo) : undefined,
            url: this.seo.absolute(vendorPath(v.id, v.slug))
          }
        });
      },
      error: err => {
        this.loading = false;
        this.error = err?.status === 404 ? 'storefront.vendorDetail.notFound' : 'storefront.vendorDetail.loadError';
      }
    });
  }

  logoUrl(pictureId: number) { return this.media.url(pictureId); }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
