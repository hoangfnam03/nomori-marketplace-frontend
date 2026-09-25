import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorPublicResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, RouterLink],
  template: `
    @if (loading) {
      <p class="state">Loading vendor…</p>
    }
    @if (error) {
      <p class="state state-error" role="alert">{{ error }}</p>
    }
    @if (!loading && !error && vendor) {
      <div class="page-heading">
        <app-breadcrumb [items]="[
          { label: 'Vendors', url: '/storefront/vendors' },
          { label: vendor.name }
        ]" />
      </div>

      <div class="vendor-layout">
        <aside class="vendor-aside">
          <div class="vendor-avatar" aria-hidden="true">{{ initial(vendor.name) }}</div>
        </aside>

        <div class="vendor-body">
          <div class="eyebrow">Vendor</div>
          <h1>{{ vendor.name }}</h1>
          <a [href]="'mailto:' + vendor.email" class="vendor-email">{{ vendor.email }}</a>

          @if (vendor.description) {
            <div class="vendor-desc">
              <p>{{ vendor.description }}</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

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

  vendor: VendorPublicResponse | null = null;
  loading = false;
  error = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error = 'Invalid vendor.'; return; }
    this.loading = true;
    this.api.getVendor(id).subscribe({
      next: v => { this.vendor = v; this.loading = false; },
      error: err => {
        this.loading = false;
        this.error = err?.status === 404 ? 'Vendor not found.' : 'Failed to load vendor.';
      }
    });
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
