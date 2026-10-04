import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { CustomerAccountDataApiService } from '../../../core/customer/customer-account-data-api.service';
import { DirectoryApiService, PublicCountry, PublicState } from '../../../core/directory/directory-api.service';

/**
 * Adds an address to the customer's address book, with the country and state rules of F07-C (the API checks them again).
 * Emits <c>saved</c> once the address is stored.
 */
@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoDirective],
  template: `
    <form class="address-form" [formGroup]="form" (ngSubmit)="save()" novalidate *transloco="let t">
      <div class="row">
        <label>{{ t('customer.fields.lastName') }} *<input formControlName="lastName" autocomplete="family-name" maxlength="100" />
          @if (error('lastName')) { <span class="field-error">{{ error('lastName') }}</span> }</label>
        <label>{{ t('customer.fields.firstName') }} *<input formControlName="firstName" autocomplete="given-name" maxlength="100" />
          @if (error('firstName')) { <span class="field-error">{{ error('firstName') }}</span> }</label>
      </div>
      <label>{{ t('customer.fields.phone') }} *<input formControlName="phoneNumber" type="tel" autocomplete="tel" maxlength="32" />
        @if (error('phoneNumber')) { <span class="field-error">{{ error('phoneNumber') }}</span> }</label>
      <label>{{ t('customer.fields.address') }} *<input formControlName="address1" autocomplete="address-line1" maxlength="200" />
        @if (error('address1')) { <span class="field-error">{{ error('address1') }}</span> }</label>
      <label>{{ t('customer.fields.address2Optional') }}<input formControlName="address2" autocomplete="address-line2" maxlength="200" /></label>
      <div class="row">
        <label>{{ t('customer.fields.city') }} *<input formControlName="city" autocomplete="address-level2" maxlength="100" />
          @if (error('city')) { <span class="field-error">{{ error('city') }}</span> }</label>
        <label>{{ t('customer.fields.country') }} *
          <select formControlName="countryCode" (change)="loadStates(true)">
            @for (c of countries; track c.code) { <option [value]="c.code">{{ c.name }}</option> }
          </select>
          @if (error('countryCode')) { <span class="field-error">{{ error('countryCode') }}</span> }</label>
      </div>
      <div class="row">
        @if (states.length > 0) {
          <label>{{ t('customer.fields.stateProvince') }} *
            <select formControlName="stateProvinceId">
              <option [ngValue]="null">{{ t('customer.settings.choose') }}</option>
              @for (s of states; track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
            </select>
            @if (error('stateProvinceId')) { <span class="field-error">{{ error('stateProvinceId') }}</span> }</label>
        } @else {
          <label>{{ t('customer.fields.stateProvinceOptional') }}<input formControlName="stateProvince" maxlength="100" />
            @if (error('stateProvince')) { <span class="field-error">{{ error('stateProvince') }}</span> }</label>
        }
        <label>{{ t('customer.fields.postalCode') }}{{ country()?.postalCodeRequired ? ' *' : '' }}<input formControlName="zipPostalCode" autocomplete="postal-code" maxlength="20" />
          @if (error('zipPostalCode')) { <span class="field-error">{{ error('zipPostalCode') }}</span> }</label>
      </div>
      <label class="check"><input type="checkbox" formControlName="isDefault" /> {{ t('customer.settings.defaultAddress') }}</label>
      @if (failed) { <p class="field-error" role="alert">{{ t(failed) }}</p> }
      <div class="actions">
        <button type="submit" class="save" [disabled]="saving">{{ saving ? t('common.states.saving') : t('customer.settings.addAddress') }}</button>
        <button type="button" class="cancel" (click)="cancelled.emit()" [disabled]="saving">{{ t('common.actions.cancel') }}</button>
      </div>
    </form>
  `,
  styles: [`
    .address-form { display: grid; gap: .75rem; }
    .row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
    label { display: grid; gap: .3rem; color: var(--muted); font: 500 .72rem var(--mono-font); letter-spacing: .06em; text-transform: uppercase; }
    input:not([type="checkbox"]), select { border: 1px solid var(--line-strong); padding: .6rem; background: var(--paper); color: var(--ink); font: inherit; font-size: .9rem; text-transform: none; letter-spacing: normal; }
    .check { display: flex; align-items: center; gap: .5rem; text-transform: none; font-size: .85rem; }
    .field-error { color: #a84031; font-size: .76rem; text-transform: none; letter-spacing: normal; }
    .actions { display: flex; gap: .75rem; }
    .save { border: 1px solid var(--ink); padding: .55rem 1rem; background: var(--ink); color: var(--paper); font: 700 .85rem inherit; cursor: pointer; }
    .cancel { border: 1px solid var(--line-strong); padding: .55rem 1rem; background: transparent; color: var(--ink); font: inherit; font-size: .85rem; cursor: pointer; }
    @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
  `]
})
export class AddressFormComponent implements OnInit {
  private readonly api = inject(CustomerAccountDataApiService);
  private readonly directory = inject(DirectoryApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Ticked by default when the customer has no address yet. */
  @Input() makeDefault = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  countries: PublicCountry[] = [];
  states: PublicState[] = [];
  fieldErrors: Record<string, string[]> = {};
  failed = '';
  saving = false;

  readonly form = this.fb.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required], company: [''],
    address1: ['', Validators.required], address2: [''], city: ['', Validators.required],
    countryCode: ['VN', Validators.required], stateProvince: [''], stateProvinceId: [null as number | null],
    zipPostalCode: [''], phoneNumber: ['', Validators.required], isDefault: [false]
  });

  ngOnInit() {
    this.form.controls.isDefault.setValue(this.makeDefault);
    this.directory.countries().subscribe({
      next: countries => {
        this.countries = countries;
        if (!countries.some(c => c.code === this.form.controls.countryCode.value) && countries.length > 0)
          this.form.controls.countryCode.setValue(countries[0].code);
        this.loadStates(false);
      },
      error: () => this.failed = 'customer.settings.errors.loadCountries'
    });
  }

  country() { return this.countries.find(c => c.code === this.form.controls.countryCode.value); }

  loadStates(clear: boolean) {
    if (clear) this.form.patchValue({ stateProvinceId: null, stateProvince: '' });
    if (!this.country()?.hasStates) { this.states = []; return; }
    this.directory.states(this.form.controls.countryCode.value).subscribe({ next: s => this.states = s, error: () => this.states = [] });
  }

  error(field: string) { return this.fieldErrors[field]?.[0] ?? ''; }

  save() {
    this.failed = '';
    if (this.form.invalid) {
      const required = ['lastName', 'firstName', 'phoneNumber', 'address1', 'city'] as const;
      this.fieldErrors = Object.fromEntries(required.filter(f => !this.form.controls[f].value.trim()).map(f => [f, ['*']]));
      this.failed = 'customer.settings.errors.requiredFields';
      return;
    }
    this.saving = true;
    this.fieldErrors = {};
    this.api.saveAddress(this.form.getRawValue()).subscribe({
      next: () => { this.saving = false; this.saved.emit(); },
      error: err => {
        this.saving = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.failed = Object.keys(this.fieldErrors).length ? 'errors.badRequest' : 'customer.settings.errors.saveAddress';
      }
    });
  }
}
