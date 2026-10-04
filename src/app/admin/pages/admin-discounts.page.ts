import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DiscountManagerComponent } from '../../shared/components/discount-manager/discount-manager.component';

/** Platform discount codes: the platform pays for them and they apply to the whole cart. */
@Component({
  standalone: true,
  imports: [DiscountManagerComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="discounts-title">
      <div class="eyebrow">{{ t('discounts.adminEyebrow') }}</div>
      <h1 id="discounts-title">{{ t('discounts.adminTitle') }}</h1>
      <p>{{ t('discounts.adminLede') }}</p>
    </section>
    <app-discount-manager [vendorId]="null" />
    </ng-container>
  `
})
export class AdminDiscountsPage {}
