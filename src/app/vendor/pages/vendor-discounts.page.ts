import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { DiscountManagerComponent } from '../../shared/components/discount-manager/discount-manager.component';

/** Discount codes of the member's shop. The shop pays for them and they apply only to its products. */
@Component({
  standalone: true,
  imports: [RouterLink, DiscountManagerComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="discounts-title">
      <div class="eyebrow">{{ t('vendor.shipping.eyebrow') }}</div>
      <h1 id="discounts-title">{{ t('discounts.vendorTitle') }}</h1>
      <p>{{ t('discounts.vendorLede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (loading) {
      <div class="panel"><p class="state">{{ t('common.states.loading') }}</p></div>
    } @else if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
      </div></div>
    } @else if (!vendorId) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <app-discount-manager [vendorId]="vendorId" />
    }
    </ng-container>
  `
})
export class VendorDiscountsPage implements OnInit {
  private readonly auth = inject(AuthFacade);
  private readonly transloco = inject(TranslocoService);

  vendorId: number | null = null;
  loading = true;
  loadError = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => { this.vendorId = session.vendorId; this.loading = false; },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }
}
