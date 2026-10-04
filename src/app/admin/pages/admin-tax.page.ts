import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DirectoryApiService, PublicCountry, PublicState } from '../../core/directory/directory-api.service';
import { TaxApiService } from '../../core/tax/tax-api.service';
import { ProductTax, TaxCategory, TaxRate } from '../../core/tax/tax.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface RateForm {
  countryCode: string;
  stateProvinceId: number | null;
  percentage: number | null;
  published: boolean;
}

const emptyRate = (): RateForm => ({ countryCode: '', stateProvinceId: null, percentage: null, published: true });

/**
 * Tax: the categories, the rate of each category by country and state, and which category a product is in.
 * Prices are before tax; tax is added at checkout from the delivery address.
 */
@Component({
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="tax-title">
      <div class="eyebrow">{{ t('admin.tax.eyebrow') }}</div>
      <h1 id="tax-title">{{ t('admin.tax.title') }}</h1>
      <p>{{ t('admin.tax.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header"><h2>{{ t('admin.tax.categories') }}</h2></div>
      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.common.order') }}</th><th></th></tr></thead>
            <tbody>
              @for (c of categories; track c.id) {
                <tr [class.selected]="selected?.id === c.id">
                  <td><strong>{{ c.name }}</strong> @if (c.isDefault) { <span class="badge">{{ t('admin.tax.default') }}</span> }</td>
                  <td>{{ c.displayOrder }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn btn-small" (click)="selectCategory(c)">{{ t('admin.tax.rates') }}</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="editCategory(c)" [disabled]="busy">{{ t('common.actions.edit') }}</button>
                      @if (!c.isDefault) {
                        @if (pendingDelete?.id === c.id) {
                          <button type="button" class="btn btn-danger btn-small" (click)="removeCategory(c)" [disabled]="busy">{{ t('admin.tax.confirmDelete') }}</button>
                          <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">{{ t('common.actions.cancel') }}</button>
                        } @else {
                          <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = c" [disabled]="busy">{{ t('common.actions.delete') }}</button>
                        }
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <form class="form panel-body" (ngSubmit)="saveCategory()" novalidate>
          <h3>{{ categoryId ? t('admin.tax.editCategory') : t('admin.tax.newCategory') }}</h3>
          @if (categoryError) { <p class="banner" role="alert">{{ categoryError }}</p> }
          <div class="form-row">
            <label>{{ t('admin.common.name') }} *
              <input type="text" name="categoryName" [(ngModel)]="categoryName" maxlength="100" required />
              @if (fieldError(categoryFieldErrors, 'name'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <label>{{ t('admin.common.order') }}
              <input type="number" name="categoryOrder" [(ngModel)]="categoryOrder" step="1" />
            </label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ t('common.actions.save') }}</button>
            @if (categoryId) { <button type="button" class="btn btn-secondary" (click)="resetCategory()">{{ t('common.actions.cancel') }}</button> }
          </div>
        </form>
      }
      @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
      @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
    </div>

    @if (selected) {
      <div class="panel">
        <div class="panel-header"><h2>{{ t('admin.tax.ratesOf', { name: selected.name }) }}</h2></div>
        @if (rates.length === 0) {
          <p class="state">{{ t('admin.tax.noRates') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>{{ t('admin.tax.place') }}</th><th>{{ t('admin.tax.percentage') }}</th><th>{{ t('admin.common.status') }}</th><th></th></tr></thead>
              <tbody>
                @for (r of rates; track r.id) {
                  <tr>
                    <td>{{ place(r) }}</td>
                    <td>{{ r.percentage }}%</td>
                    <td><span class="badge" [class.badge-active]="r.published">{{ r.published ? t('admin.tax.published') : t('admin.tax.hidden') }}</span></td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="btn btn-secondary btn-small" (click)="editRate(r)" [disabled]="busy">{{ t('common.actions.edit') }}</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="removeRate(r)" [disabled]="busy">{{ t('common.actions.delete') }}</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <form class="form panel-body" (ngSubmit)="saveRate()" novalidate>
          <h3>{{ rateId ? t('admin.tax.editRate') : t('admin.tax.newRate') }}</h3>
          @if (rateError) { <p class="banner" role="alert">{{ rateError }}</p> }
          <div class="form-row">
            <label>{{ t('admin.tax.country') }} *
              <select name="country" [ngModel]="rateForm.countryCode" (ngModelChange)="chooseCountry($event)">
                <option value="">{{ t('admin.tax.chooseCountry') }}</option>
                @for (c of countries; track c.code) { <option [value]="c.code">{{ c.name }}</option> }
              </select>
              @if (fieldError(rateFieldErrors, 'countryCode'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            @if (states.length > 0) {
              <label>{{ t('admin.tax.state') }}
                <select name="state" [(ngModel)]="rateForm.stateProvinceId">
                  <option [ngValue]="null">{{ t('admin.tax.wholeCountry') }}</option>
                  @for (s of states; track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
                </select>
                @if (fieldError(rateFieldErrors, 'stateProvinceId'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
            }
            <label>{{ t('admin.tax.percentage') }} (%) *
              <input type="number" name="percentage" [(ngModel)]="rateForm.percentage" min="0" max="100" step="0.001" required />
              @if (fieldError(rateFieldErrors, 'percentage'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
          </div>
          <label class="check-label"><input type="checkbox" name="published" [(ngModel)]="rateForm.published" /> {{ t('admin.tax.publishedLabel') }}</label>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ t('common.actions.save') }}</button>
            @if (rateId) { <button type="button" class="btn btn-secondary" (click)="resetRate()">{{ t('common.actions.cancel') }}</button> }
          </div>
        </form>
      </div>
    }

    <div class="panel">
      <div class="panel-header"><h2>{{ t('admin.tax.productHeading') }}</h2></div>
      <form class="form panel-body" (ngSubmit)="lookupProduct()" novalidate>
        <p class="muted">{{ t('admin.tax.productHint') }}</p>
        <div class="form-row">
          <label>{{ t('admin.tax.productId') }}
            <input type="number" name="productId" [(ngModel)]="productId" min="1" step="1" />
          </label>
          <div class="actions"><button type="submit" class="btn btn-secondary" [disabled]="busy || !productId">{{ t('admin.tax.lookup') }}</button></div>
        </div>
        @if (productError) { <p class="banner" role="alert">{{ productError }}</p> }
        @if (product) {
          <p><strong>{{ product.productName }}</strong> · {{ product.taxCategoryName }}@if (!product.assigned) { <span class="muted"> ({{ t('admin.tax.defaultAssigned') }})</span> }</p>
          <div class="form-row">
            <label>{{ t('admin.tax.category') }}
              <select name="productCategory" [(ngModel)]="productCategoryId">
                <option [ngValue]="null">{{ t('admin.tax.useDefault') }}</option>
                @for (c of categories; track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </label>
            <div class="actions"><button type="button" class="btn" (click)="assignProduct()" [disabled]="busy">{{ t('common.actions.save') }}</button></div>
          </div>
        }
      </form>
    </div>
    </ng-container>
  `
})
export class AdminTaxPage implements OnInit {
  private readonly api = inject(TaxApiService);
  private readonly directory = inject(DirectoryApiService);
  private readonly transloco = inject(TranslocoService);

  categories: TaxCategory[] = [];
  loading = true;
  loadError = '';
  busy = false;
  notice = '';
  actionError = '';

  // category form
  categoryId: number | null = null;
  categoryName = '';
  categoryOrder = 0;
  categoryError = '';
  categoryFieldErrors: Record<string, string[]> = {};
  pendingDelete: TaxCategory | null = null;

  // rates
  selected: TaxCategory | null = null;
  rates: TaxRate[] = [];
  countries: PublicCountry[] = [];
  states: PublicState[] = [];
  stateNames = new Map<number, string>();
  rateId: number | null = null;
  rateForm: RateForm = emptyRate();
  rateError = '';
  rateFieldErrors: Record<string, string[]> = {};

  // product
  productId: number | null = null;
  product: ProductTax | null = null;
  productCategoryId: number | null = null;
  productError = '';

  ngOnInit() {
    this.directory.countries().subscribe({ next: countries => { this.countries = countries; } });
    this.load();
  }

  fieldError(errors: Record<string, string[]>, name: string) { return errors[name]?.join(' ') ?? ''; }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.categories().subscribe({
      next: categories => { this.categories = categories; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.load')); }
    });
  }

  // ---- Categories ----

  editCategory(c: TaxCategory) { this.categoryId = c.id; this.categoryName = c.name; this.categoryOrder = c.displayOrder; this.categoryError = ''; this.categoryFieldErrors = {}; }

  resetCategory() { this.categoryId = null; this.categoryName = ''; this.categoryOrder = 0; this.categoryError = ''; this.categoryFieldErrors = {}; }

  saveCategory() {
    const body = { name: this.categoryName.trim(), displayOrder: Number(this.categoryOrder) || 0 };
    if (!body.name) { this.categoryError = this.transloco.translate('admin.tax.errors.nameRequired'); return; }
    this.busy = true;
    this.categoryError = '';
    this.categoryFieldErrors = {};
    this.notice = '';
    const request = this.categoryId ? this.api.updateCategory(this.categoryId, body) : this.api.createCategory(body);
    request.subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('admin.tax.saved'); this.resetCategory(); this.load(); },
      error: err => {
        this.busy = false;
        this.categoryFieldErrors = err?.status === 400 && err?.fieldErrors ? err.fieldErrors : {};
        this.categoryError = Object.keys(this.categoryFieldErrors).length > 0 ? '' : vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.save'));
      }
    });
  }

  removeCategory(c: TaxCategory) {
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.deleteCategory(c.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; if (this.selected?.id === c.id) this.selected = null; this.load(); },
      error: err => {
        this.busy = false;
        this.pendingDelete = null;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.delete'));
        if (err?.status === 404 || err?.status === 409) this.load();
      }
    });
  }

  // ---- Rates ----

  selectCategory(c: TaxCategory) {
    this.selected = c;
    this.resetRate();
    this.loadRates();
  }

  place(r: TaxRate) {
    const country = this.countries.find(c => c.code === r.countryCode)?.name ?? r.countryCode;
    const state = r.stateProvinceId === null ? null : this.stateNames.get(r.stateProvinceId) ?? null;
    return state ? `${country} / ${state}` : country;
  }

  chooseCountry(code: string) {
    this.rateForm.countryCode = code;
    this.rateForm.stateProvinceId = null;
    this.loadStates(code, null);
  }

  editRate(r: TaxRate) {
    this.rateId = r.id;
    this.rateForm = { countryCode: r.countryCode, stateProvinceId: r.stateProvinceId, percentage: r.percentage, published: r.published };
    this.rateError = '';
    this.rateFieldErrors = {};
    this.loadStates(r.countryCode, r.stateProvinceId);
  }

  resetRate() { this.rateId = null; this.rateForm = emptyRate(); this.states = []; this.rateError = ''; this.rateFieldErrors = {}; }

  saveRate() {
    const f = this.rateForm;
    if (!this.selected || !f.countryCode || f.percentage === null) { this.rateError = this.transloco.translate('admin.tax.errors.rateRequired'); return; }
    const body = { countryCode: f.countryCode, stateProvinceId: f.stateProvinceId, percentage: f.percentage, published: f.published };
    this.busy = true;
    this.rateError = '';
    this.rateFieldErrors = {};
    this.notice = '';
    const request = this.rateId ? this.api.updateRate(this.rateId, body) : this.api.createRate(this.selected.id, body);
    request.subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('admin.tax.saved'); this.resetRate(); this.loadRates(); },
      error: err => {
        this.busy = false;
        this.rateFieldErrors = err?.status === 400 && err?.fieldErrors ? err.fieldErrors : {};
        this.rateError = Object.keys(this.rateFieldErrors).length > 0 ? '' : vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.save'));
      }
    });
  }

  removeRate(r: TaxRate) {
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.deleteRate(r.id).subscribe({
      next: () => { this.busy = false; this.loadRates(); },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.delete'));
        if (err?.status === 404) this.loadRates();
      }
    });
  }

  // ---- Product ----

  lookupProduct() {
    if (!this.productId) return;
    this.busy = true;
    this.productError = '';
    this.product = null;
    this.api.product(this.productId).subscribe({
      next: product => { this.busy = false; this.product = product; this.productCategoryId = product.assigned ? product.taxCategoryId : null; },
      error: err => { this.busy = false; this.productError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.product')); }
    });
  }

  assignProduct() {
    if (!this.product) return;
    this.busy = true;
    this.productError = '';
    this.notice = '';
    this.api.assignProduct(this.product.productId, this.productCategoryId).subscribe({
      next: product => { this.busy = false; this.product = product; this.notice = this.transloco.translate('admin.tax.saved'); this.load(); },
      error: err => { this.busy = false; this.productError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.save')); }
    });
  }

  // ---- Helpers ----

  private loadRates() {
    if (!this.selected) return;
    this.api.rates(this.selected.id).subscribe({
      next: rates => {
        this.rates = rates;
        // The list names states, so the states of the countries that rates use are loaded once each.
        for (const code of new Set(rates.filter(r => r.stateProvinceId !== null).map(r => r.countryCode))) {
          this.directory.states(code).subscribe({
            next: states => { for (const s of states) this.stateNames.set(s.id, s.name); this.stateNames = new Map(this.stateNames); },
            error: () => { /* the list then shows the country only */ }
          });
        }
      },
      error: err => { this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.tax.errors.load')); }
    });
  }

  private loadStates(countryCode: string, keep: number | null) {
    if (!countryCode) { this.states = []; return; }
    this.directory.states(countryCode).subscribe({
      next: states => { this.states = states; this.rateForm.stateProvinceId = states.some(s => s.id === keep) ? keep : null; },
      error: () => { this.states = []; }
    });
  }
}
