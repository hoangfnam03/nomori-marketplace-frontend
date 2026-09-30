import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="portal-title">
      <div class="eyebrow">Vendor portal</div>
      <h1 id="portal-title">{{ vendor?.name ?? 'Your shop' }}</h1>
      <p>Manage your shop and the people who work on it.</p>
    </section>

    <div class="panel">
      @if (loading) {
        <p class="state">Loading shop…</p>
      } @else if (error) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ error }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
        </div>
      } @else if (vendor) {
        <div class="panel-header">
          <h2>Shop details</h2>
          <span [class]="vendor.active ? 'badge badge-active' : 'badge'">{{ vendor.active ? 'Active' : 'Inactive — hidden from the storefront' }}</span>
        </div>
        <div class="panel-body">
          <dl class="detail-grid">
            <dt>Name</dt><dd>{{ vendor.name }}</dd>
            <dt>Contact email</dt><dd>{{ vendor.email }}</dd>
            <dt>Description</dt><dd>{{ vendor.description || '—' }}</dd>
            <dt>Created</dt><dd>{{ vendor.createdOnUtc | date:'medium' }}</dd>
          </dl>
          <div class="actions">
            <a class="btn" routerLink="/vendor/members">Manage members</a>
            <a class="btn btn-secondary" [routerLink]="['/storefront/vendors', vendor.id]">View public page</a>
          </div>
        </div>
      } @else {
        <div class="panel-body">
          <p class="banner banner-info">Your account does not belong to a shop.</p>
          <div class="actions"><a class="btn" routerLink="/customer/become-vendor">Apply to open a shop</a></div>
        </div>
      }
    </div>
  `
})
export class VendorPortalPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);

  vendor: VendorResponse | null = null;
  loading = true;
  error = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    // The vendor id comes from the session; re-read it so a fresh approval shows up straight away.
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        if (!session.vendorId) { this.vendor = null; this.loading = false; return; }
        this.api.getVendor(session.vendorId).subscribe({
          next: vendor => { this.vendor = vendor; this.loading = false; },
          error: err => { this.loading = false; this.error = vendorErrorMessage(err, 'Unable to load your shop.'); }
        });
      },
      error: () => { this.loading = false; this.error = 'Unable to load your account.'; }
    });
  }
}
