import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { GhnPickupComponent } from '../components/ghn-pickup.component';

/** Shipping of the signed-in member's shop: everything goes with GHN from the shop's pickup address, priced by GHN. */
@Component({
  standalone: true,
  imports: [GhnPickupComponent, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="shipping-title">
      <div class="eyebrow">{{ t('vendor.shipping.eyebrow') }}</div>
      <h1 id="shipping-title">{{ t('vendor.shipping.title') }}</h1>
      <p>{{ t('vendor.shipping.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (loading) {
      <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
    } @else if (!vendorId) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <app-ghn-pickup [vendorId]="vendorId" />
    }
    </ng-container>
  `
})
export class VendorShippingPage implements OnInit {
  private readonly auth = inject(AuthFacade);

  vendorId: number | null = null;
  loading = true;

  ngOnInit() {
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => { this.vendorId = session.vendorId; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
