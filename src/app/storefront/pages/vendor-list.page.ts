import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorPublicResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-hero" aria-labelledby="vendors-title">
      <div class="eyebrow">Marketplace</div>
      <h1 id="vendors-title">Vendors</h1>
      <p>Browse all vendors on Nomori Marketplace.</p>
    </section>

    <div class="page-content">
      @if (loading) {
        <p class="loading-msg">Loading vendors…</p>
      } @else if (vendors.length === 0) {
        <p class="empty-msg">No vendors at the moment.</p>
      } @else {
        <ul class="vendor-grid" role="list">
          @for (v of vendors; track v.id) {
            <li class="vendor-card">
              <a [routerLink]="['/storefront/vendors', v.id]" class="vendor-link">
                <div class="vendor-avatar" aria-hidden="true">{{ initial(v.name) }}</div>
                <div class="vendor-info">
                  <div class="vendor-name">{{ v.name }}</div>
                  @if (v.description) {
                    <p class="vendor-desc">{{ v.description }}</p>
                  }
                </div>
              </a>
            </li>
          }
        </ul>

        @if (totalPages > 1) {
          <div class="pagination">
            <button [disabled]="page === 1" (click)="goPage(page - 1)">‹ Prev</button>
            <span>Page {{ page }} of {{ totalPages }}</span>
            <button [disabled]="page === totalPages" (click)="goPage(page + 1)">Next ›</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-hero {
      padding: 3rem var(--page-gutter, 2rem) 2rem;
      border-bottom: 1px solid var(--line);
    }
    .eyebrow {
      font-family: var(--mono-font);
      font-size: .75rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: .4rem;
    }
    h1 { font-family: var(--display-font); font-size: 2.5rem; margin: 0 0 .5rem; }
    p { color: var(--muted); margin: 0; }

    .page-content { padding: 2rem var(--page-gutter, 2rem); }

    .vendor-grid {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .vendor-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
      transition: box-shadow .15s;
    }
    .vendor-card:hover { box-shadow: 0 4px 16px color-mix(in srgb, var(--ink) 10%, transparent); }

    .vendor-link {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      text-decoration: none;
      color: inherit;
    }

    .vendor-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--green) 15%, var(--paper));
      color: var(--green);
      font-family: var(--display-font);
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .vendor-name { font-weight: 600; font-size: 1rem; margin-bottom: .2rem; }
    .vendor-desc {
      font-size: .85rem;
      color: var(--muted);
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .loading-msg, .empty-msg { color: var(--muted); font-size: .9rem; }

    .pagination {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      font-size: .875rem;
    }
    .pagination button {
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: .3rem .7rem;
      background: var(--paper);
      cursor: pointer;
    }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class VendorListPage implements OnInit {
  private readonly api = inject(VendorApiService);

  vendors: VendorPublicResponse[] = [];
  loading = false;
  page = 1;
  totalPages = 1;

  ngOnInit() { this.loadVendors(); }

  loadVendors() {
    this.loading = true;
    this.api.getVendors(this.page).subscribe({
      next: res => { this.vendors = res.items; this.totalPages = res.totalPages; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  goPage(p: number) { this.page = p; this.loadVendors(); }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
