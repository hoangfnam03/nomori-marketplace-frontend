import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { MediaApiService } from '../../core/media/media-api.service';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorResponse } from '../../core/vendors/vendor.models';
import { DATE_FORMAT, formatDateTime } from '../../shared/utils/datetime';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  styles: [`.shop-logo { width: 96px; height: 96px; object-fit: cover; border: 1px solid var(--line); border-radius: 8px; }`],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="portal-title">
      <div class="eyebrow">{{ t('vendor.portal.eyebrow') }}</div>
      <h1 id="portal-title">{{ vendor?.name ?? t('vendor.portal.yourShop') }}</h1>
      <p>{{ t('vendor.portal.lede') }}</p>
    </section>

    <div class="panel">
      @if (loading) {
        <p class="state">{{ t('vendor.portal.loading') }}</p>
      } @else if (error) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ error }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (vendor) {
        <div class="panel-header">
          <h2>{{ t('vendor.portal.details') }}</h2>
          <span [class]="vendor.active ? 'badge badge-active' : 'badge'">{{ vendor.active ? t('vendorStatus.vendor.active') : t('vendor.portal.inactiveHidden') }}</span>
        </div>
        <div class="panel-body">
          @if (media.url(vendor.pictureId); as logo) {
            <img class="shop-logo" [src]="logo" [alt]="t('vendor.settings.logo')" width="96" height="96" />
          }
          <dl class="detail-grid">
            <dt>{{ t('admin.common.name') }}</dt><dd>{{ vendor.name }}</dd>
            <dt>{{ t('vendor.portal.contactEmail') }}</dt><dd>{{ vendor.email }}</dd>
            <dt>{{ t('admin.common.description') }}</dt><dd>{{ vendor.description || '—' }}</dd>
            <dt>{{ t('admin.common.created') }}</dt><dd>{{ vendor.createdOnUtc }}</dd>
          </dl>
          <div class="actions">
            <a class="btn" routerLink="/vendor/settings">{{ t('vendor.portal.editShop') }}</a>
            <a class="btn" routerLink="/vendor/products">{{ t('vendor.portal.manageProducts') }}</a>
            <a class="btn" routerLink="/vendor/shipping">{{ t('vendor.portal.manageShipping') }}</a>
            <a class="btn" routerLink="/vendor/members">{{ t('vendor.portal.manageMembers') }}</a>
            <a class="btn btn-secondary" [routerLink]="['/storefront/vendors', vendor.id]">{{ t('vendor.portal.viewPublic') }}</a>
          </div>
        </div>
      } @else {
        <div class="panel-body">
          <p class="banner banner-info">{{ t('vendor.portal.noShop') }}</p>
          <div class="actions"><a class="btn" routerLink="/customer/become-vendor">{{ t('vendor.portal.apply') }}</a></div>
        </div>
      }
    </div>
    </ng-container>
  `
})
export class VendorPortalPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);
  readonly media = inject(MediaApiService);
  private readonly transloco = inject(TranslocoService);

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
          next: vendor => { 
            this.vendor = { 
              ...vendor, 
              createdOnUtc: formatDateTime(vendor.createdOnUtc, DATE_FORMAT) 
            }; 
            this.loading = false; 
          },
          error: err => { this.loading = false; this.error = vendorErrorMessage(err, this.transloco.translate('vendor.portal.errors.loadShop')); }
        });
      },
      error: () => { this.loading = false; this.error = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }
}
