import { Component, inject, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CustomerAccountDataApiService, CustomerAddress } from '../../../core/customer/customer-account-data-api.service';
import { DirectoryApiService, PublicCountry, PublicState } from '../../../core/directory/directory-api.service';
import { CurrencyService } from '../../../core/money/currency.service';
import { ShippingApiService } from '../../../core/shipping/shipping-api.service';
import { ShippingOption, ShippingQuote, ShippingQuoteRequest } from '../../../core/shipping/shipping.models';
import { vendorErrorMessage } from '../../../core/vendors/vendor-errors';

/** The "other destination" choice of the address list. */
const OTHER = 'other';

/**
 * Shipping estimate for the cart: the customer picks a saved address, or a country, and sees the options of every shop.
 * It is a preview: nothing is chosen or charged until checkout.
 */
@Component({
  selector: 'app-shipping-estimate',
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="estimate" [attr.aria-label]="t('storefront.cart.shipping.title')">
      <h2>{{ t('storefront.cart.shipping.title') }}</h2>

      @if (loading) {
        <p class="muted">{{ t('storefront.cart.shipping.loading') }}</p>
      } @else {
        <div class="chooser">
          @if (addresses.length > 0) {
            <label>{{ t('storefront.cart.shipping.deliverTo') }}
              <select name="destination" [(ngModel)]="choice" (ngModelChange)="reset()">
                @for (a of addresses; track a.id) {
                  <option [ngValue]="a.id">{{ addressLabel(a) }}</option>
                }
                <option [ngValue]="other">{{ t('storefront.cart.shipping.otherCountry') }}</option>
              </select>
            </label>
          }
          @if (choice === other) {
            <label>{{ t('storefront.cart.shipping.country') }}
              <select name="country" [ngModel]="countryCode" (ngModelChange)="chooseCountry($event)">
                <option value="">{{ t('storefront.cart.shipping.chooseCountry') }}</option>
                @for (c of countries; track c.code) { <option [value]="c.code">{{ c.name }}</option> }
              </select>
            </label>
            @if (states.length > 0) {
              <label>{{ t('storefront.cart.shipping.state') }}
                <select name="state" [(ngModel)]="stateId" (ngModelChange)="reset()">
                  <option [ngValue]="null">{{ t('storefront.cart.shipping.chooseState') }}</option>
                  @for (s of states; track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
                </select>
              </label>
            }
          }
          <button type="button" class="secondary" (click)="estimate()" [disabled]="busy || !canEstimate()">
            {{ busy ? t('storefront.cart.shipping.estimating') : t('storefront.cart.shipping.estimate') }}
          </button>
        </div>
        @if (addresses.length === 0 && choice === other) { <p class="muted hint">{{ t('storefront.cart.shipping.noAddress') }}</p> }
        @if (error) { <p class="issue" role="alert">{{ error }}</p> }

        @if (quote) {
          <div class="result" role="status">
            @for (shop of quote.shops; track shop.vendorId) {
              <div class="shop">
                <strong>{{ shop.vendorName ?? t('admin.catalog.shop') }}</strong>
                @if (shop.canShip) {
                  <ul>
                    @for (option of shop.options; track option.rateId) {
                      <li>
                        <span>{{ option.name }}@if (daysText(option); as d) { <span class="muted"> · {{ d }}</span> }</span>
                        <span>{{ option.isFree ? t('storefront.cart.shipping.free') : money(option.fee) }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="issue">{{ t('storefront.cart.shipping.cannotShip') }}</p>
                }
              </div>
            }
            @if (quote.shippingTotal !== null) {
              <div class="total"><span>{{ t('storefront.cart.shipping.total') }}</span><strong>{{ money(quote.shippingTotal) }}</strong></div>
              <p class="muted hint">{{ t('storefront.cart.shipping.totalNote') }}</p>
            } @else if (quote.shops.length > 0) {
              <p class="issue">{{ t('storefront.cart.shipping.someCannotShip') }}</p>
            }
          </div>
        }
      }
    </section>
    </ng-container>
  `,
  styles: [`
    :host { display: block; margin-top: 1.5rem; }
    .estimate { border: 1px solid var(--line-strong); padding: 1.25rem; }
    h2 { margin: 0 0 1rem; font: 700 1.1rem var(--display-font); }
    .chooser { display: grid; gap: .75rem; }
    label { display: grid; gap: .3rem; font-size: .8rem; color: var(--muted); }
    select { border: 1px solid var(--line-strong); padding: .5rem; background: transparent; color: var(--ink); font: inherit; }
    .secondary { border: 1px solid var(--ink); padding: .5rem .9rem; background: transparent; color: var(--ink); font: 700 .8rem inherit; cursor: pointer; }
    .secondary:disabled { opacity: .4; cursor: not-allowed; }
    .muted { color: var(--muted); font-size: .8rem; }
    .hint { margin: .5rem 0 0; line-height: 1.5; }
    .issue { margin: .5rem 0 0; color: #8d3128; font-size: .8rem; font-weight: 600; }
    .result { margin-top: 1rem; display: grid; gap: .9rem; }
    .shop ul { list-style: none; margin: .35rem 0 0; padding: 0; display: grid; gap: .25rem; font-size: .85rem; }
    .shop li { display: flex; justify-content: space-between; gap: 1rem; }
    .total { display: flex; justify-content: space-between; padding-top: .75rem; border-top: 1px solid var(--line); }
  `]
})
export class ShippingEstimateComponent implements OnInit, OnChanges {
  private readonly shipping = inject(ShippingApiService);
  private readonly accountData = inject(CustomerAccountDataApiService);
  private readonly directory = inject(DirectoryApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  /** Changes whenever the cart changes, so a shown estimate is refreshed. */
  @Input() cartKey = '';

  readonly other = OTHER;
  addresses: CustomerAddress[] = [];
  countries: PublicCountry[] = [];
  states: PublicState[] = [];
  choice: number | typeof OTHER = OTHER;
  countryCode = '';
  stateId: number | null = null;

  loading = true;
  busy = false;
  error = '';
  quote: ShippingQuote | null = null;

  ngOnInit() {
    this.directory.countries().subscribe({
      next: countries => {
        this.countries = countries.filter(c => c.allowsShipping);
        this.accountData.addresses().subscribe({
          next: addresses => { this.addresses = addresses; this.choice = (addresses.find(a => a.isDefault) ?? addresses[0])?.id ?? OTHER; this.loading = false; },
          // Without addresses the customer can still estimate by country.
          error: () => { this.loading = false; }
        });
      },
      error: () => { this.loading = false; this.error = this.transloco.translate('storefront.cart.shipping.errors.load'); }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // A shown estimate follows the cart: new quantities change the subtotal that decides free shipping.
    if (changes['cartKey'] && !changes['cartKey'].firstChange && this.quote) this.estimate();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  addressLabel(a: CustomerAddress) {
    const state = a.stateProvince ? `${a.stateProvince}, ` : '';
    return `${a.firstName} ${a.lastName} — ${a.address1}, ${a.city}, ${state}${a.countryCode}`;
  }

  daysText(option: ShippingOption) {
    const { minDays, maxDays } = option;
    if (minDays === null && maxDays === null) return '';
    if (minDays === null || maxDays === null || minDays === maxDays) return this.transloco.translate('storefront.cart.shipping.daysOne', { days: minDays ?? maxDays });
    return this.transloco.translate('storefront.cart.shipping.daysRange', { min: minDays, max: maxDays });
  }

  canEstimate() {
    if (this.choice !== OTHER) return true;
    return !!this.countryCode && (this.states.length === 0 || this.stateId !== null);
  }

  reset() { this.quote = null; this.error = ''; }

  chooseCountry(code: string) {
    this.countryCode = code;
    this.stateId = null;
    this.states = [];
    this.reset();
    if (!code) return;
    this.directory.states(code).subscribe({ next: states => { if (this.countryCode === code) this.states = states; } });
  }

  estimate() {
    const body: ShippingQuoteRequest = this.choice === OTHER
      ? { countryCode: this.countryCode, stateProvinceId: this.stateId }
      : { addressId: this.choice };
    this.busy = true;
    this.error = '';
    this.shipping.quote(body).subscribe({
      next: quote => { this.busy = false; this.quote = quote; },
      error: err => {
        this.busy = false;
        this.quote = null;
        this.error = vendorErrorMessage(err, this.transloco.translate('storefront.cart.shipping.errors.estimate'));
      }
    });
  }
}
