import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { DirectoryApiService, PublicCountry, PublicState } from '../../core/directory/directory-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { SaveShippingRateRequest, ShippingRate } from '../../core/shipping/shipping.models';
import { ShippingApiService } from '../../core/shipping/shipping-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface RateForm {
  name: string;
  countryCode: string;
  stateProvinceId: number | null;
  fee: number | null;
  freeOverSubtotal: number | null;
  minDays: number | null;
  maxDays: number | null;
  published: boolean;
}

const emptyForm = (): RateForm => ({
  name: '', countryCode: '', stateProvinceId: null, fee: 0, freeOverSubtotal: null, minDays: null, maxDays: null, published: true
});

/** Shipping rates of the signed-in member's shop: where the shop ships and for how much. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="shipping-title">
      <div class="eyebrow">{{ t('vendor.shipping.eyebrow') }}</div>
      <h1 id="shipping-title">{{ t('vendor.shipping.title') }}</h1>
      <p>{{ t('vendor.shipping.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('vendor.shipping.rates') }}</h2>
          <button type="button" class="btn btn-small" (click)="startCreate()" [disabled]="busy">{{ t('vendor.shipping.add') }}</button>
        </div>
        @if (loading) {
          <p class="state">{{ t('vendor.shipping.loading') }}</p>
        } @else if (loadError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
          </div>
        } @else if (rates.length === 0) {
          <p class="state">{{ t('vendor.shipping.empty') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ t('vendor.shipping.name') }}</th>
                  <th>{{ t('vendor.shipping.destination') }}</th>
                  <th>{{ t('vendor.shipping.fee') }}</th>
                  <th>{{ t('vendor.shipping.freeOver') }}</th>
                  <th>{{ t('vendor.shipping.delivery') }}</th>
                  <th>{{ t('vendor.shipping.status') }}</th>
                  <th><span class="sr-only">{{ t('vendor.shipping.actionsColumn') }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (rate of rates; track rate.id) {
                  <tr>
                    <td>{{ rate.name }}</td>
                    <td>{{ destination(rate) }}</td>
                    <td>{{ money(rate.fee) }}</td>
                    <td>{{ rate.freeOverSubtotal === null ? '—' : money(rate.freeOverSubtotal) }}</td>
                    <td>{{ days(rate) }}</td>
                    <td>
                      <span class="badge" [class.badge-active]="rate.published">
                        {{ rate.published ? t('vendor.shipping.published') : t('vendor.shipping.hidden') }}
                      </span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="btn btn-secondary btn-small" (click)="startEdit(rate)" [disabled]="busy">{{ t('vendor.shipping.edit') }}</button>
                        @if (pendingDelete?.id === rate.id) {
                          <button type="button" class="btn btn-danger btn-small" (click)="remove(rate)" [disabled]="busy">{{ t('vendor.shipping.confirmDelete') }}</button>
                          <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">{{ t('common.actions.cancel') }}</button>
                        } @else {
                          <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = rate" [disabled]="busy">{{ t('vendor.shipping.delete') }}</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
        @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
      </div>

      @if (editing) {
        <div class="panel">
          <div class="panel-header"><h2>{{ editingId ? t('vendor.shipping.editHeading') : t('vendor.shipping.addHeading') }}</h2></div>
          <form class="form panel-body" (ngSubmit)="save()" novalidate>
            @if (formError) { <p class="banner" role="alert">{{ formError }}</p> }
            <label>{{ t('vendor.shipping.name') }} *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="100" required />
              @if (fieldError('name'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <div class="form-row">
              <label>{{ t('vendor.shipping.country') }} *
                <select name="countryCode" [ngModel]="form.countryCode" (ngModelChange)="chooseCountry($event)">
                  <option value="">{{ t('vendor.shipping.chooseCountry') }}</option>
                  @for (c of countries; track c.code) { <option [value]="c.code">{{ c.name }}</option> }
                </select>
                @if (fieldError('countryCode'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              @if (states.length > 0) {
                <label>{{ t('vendor.shipping.state') }}
                  <select name="stateProvinceId" [(ngModel)]="form.stateProvinceId">
                    <option [ngValue]="null">{{ t('vendor.shipping.wholeCountry') }}</option>
                    @for (s of states; track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
                  </select>
                  @if (fieldError('stateProvinceId'); as e) { <span class="field-error">{{ e }}</span> }
                </label>
              }
            </div>
            <div class="form-row">
              <label>{{ t('vendor.shipping.fee') }} ({{ currency.primary().code }}) *
                <input type="number" name="fee" [(ngModel)]="form.fee" min="0" [step]="currency.step()" required />
                @if (fieldError('fee'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              <label>{{ t('vendor.shipping.freeOver') }} ({{ currency.primary().code }})
                <input type="number" name="freeOverSubtotal" [(ngModel)]="form.freeOverSubtotal" min="0" [step]="currency.step()" />
                <span class="hint">{{ t('vendor.shipping.freeOverHint') }}</span>
                @if (fieldError('freeOverSubtotal'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
            </div>
            <div class="form-row">
              <label>{{ t('vendor.shipping.minDays') }}
                <input type="number" name="minDays" [(ngModel)]="form.minDays" min="0" max="365" step="1" />
                @if (fieldError('minDays'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              <label>{{ t('vendor.shipping.maxDays') }}
                <input type="number" name="maxDays" [(ngModel)]="form.maxDays" min="0" max="365" step="1" />
                @if (fieldError('maxDays'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
            </div>
            <label class="check-label"><input type="checkbox" name="published" [(ngModel)]="form.published" /> {{ t('vendor.shipping.publishedLabel') }}</label>
            <div class="actions">
              <button type="submit" class="btn" [disabled]="busy">{{ busy ? t('vendor.shipping.saving') : t('vendor.shipping.save') }}</button>
              <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="busy">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        </div>
      }
    }
    </ng-container>
  `,
  styles: [`.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }`]
})
export class VendorShippingPage implements OnInit {
  private readonly api = inject(ShippingApiService);
  private readonly directory = inject(DirectoryApiService);
  private readonly auth = inject(AuthFacade);
  private readonly transloco = inject(TranslocoService);
  protected readonly currency = inject(CurrencyService);

  vendorId: number | null = null;
  rates: ShippingRate[] = [];
  countries: PublicCountry[] = [];
  states: PublicState[] = [];
  /** States of every country a rate uses, to show their names in the list. */
  private stateNames = new Map<number, string>();

  loading = true;
  loadError = '';
  busy = false;
  actionError = '';
  notice = '';
  formError = '';
  fieldErrors: Record<string, string[]> = {};
  editing = false;
  editingId: number | null = null;
  form: RateForm = emptyForm();
  pendingDelete: ShippingRate | null = null;

  ngOnInit() {
    this.currency.load();
    this.load();
  }

  load() {
    this.loading = true;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        this.directory.countries().subscribe({
          next: countries => { this.countries = countries.filter(c => c.allowsShipping); this.fetchRates(); },
          error: err => this.fail(err)
        });
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  countryName(code: string) { return this.countries.find(c => c.code === code)?.name ?? code; }

  destination(rate: ShippingRate) {
    const state = rate.stateProvinceId === null ? null : this.stateNames.get(rate.stateProvinceId) ?? null;
    return state ? `${this.countryName(rate.countryCode)} / ${state}` : this.countryName(rate.countryCode);
  }

  days(rate: ShippingRate) {
    const { minDays, maxDays } = rate;
    if (minDays === null && maxDays === null) return '—';
    if (minDays === null || maxDays === null || minDays === maxDays) return this.transloco.translate('vendor.shipping.daysOne', { days: minDays ?? maxDays });
    return this.transloco.translate('vendor.shipping.daysRange', { min: minDays, max: maxDays });
  }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  startCreate() { this.open(null, emptyForm()); }

  startEdit(rate: ShippingRate) {
    this.open(rate.id, {
      name: rate.name, countryCode: rate.countryCode, stateProvinceId: rate.stateProvinceId, fee: rate.fee,
      freeOverSubtotal: rate.freeOverSubtotal, minDays: rate.minDays, maxDays: rate.maxDays, published: rate.published
    });
    this.loadStates(rate.countryCode, rate.stateProvinceId);
  }

  cancel() { this.editing = false; this.editingId = null; this.formError = ''; this.fieldErrors = {}; }

  chooseCountry(code: string) {
    this.form.countryCode = code;
    this.form.stateProvinceId = null;
    this.loadStates(code, null);
  }

  save() {
    if (!this.vendorId) return;
    const fee = this.form.fee;
    if (!this.form.name.trim() || !this.form.countryCode || fee === null) {
      this.formError = this.transloco.translate('vendor.shipping.errors.required');
      return;
    }

    const body: SaveShippingRateRequest = {
      name: this.form.name.trim(), countryCode: this.form.countryCode, stateProvinceId: this.form.stateProvinceId,
      fee, freeOverSubtotal: this.form.freeOverSubtotal || null, minDays: this.form.minDays, maxDays: this.form.maxDays,
      published: this.form.published, displayOrder: 0
    };
    this.busy = true;
    this.formError = '';
    this.fieldErrors = {};
    this.notice = '';
    const request = this.editingId
      ? this.api.updateRate(this.vendorId, this.editingId, body)
      : this.api.createRate(this.vendorId, body);
    request.subscribe({
      next: () => {
        this.busy = false;
        this.notice = this.transloco.translate('vendor.shipping.saved');
        this.cancel();
        this.fetchRates();
      },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.status === 400 && err?.fieldErrors ? err.fieldErrors : {};
        this.formError = Object.keys(this.fieldErrors).length > 0 ? '' : vendorErrorMessage(err, this.transloco.translate('vendor.shipping.errors.save'));
      }
    });
  }

  remove(rate: ShippingRate) {
    if (!this.vendorId) return;
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.deleteRate(this.vendorId, rate.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; this.fetchRates(); },
      error: err => {
        this.busy = false;
        this.pendingDelete = null;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('vendor.shipping.errors.delete'));
        // Not found means someone else already removed it: show the current list.
        if (err?.status === 404) this.fetchRates();
      }
    });
  }

  private open(id: number | null, form: RateForm) {
    this.editing = true;
    this.editingId = id;
    this.form = form;
    this.states = [];
    this.formError = '';
    this.fieldErrors = {};
    this.notice = '';
  }

  private loadStates(countryCode: string, keep: number | null) {
    if (!countryCode) { this.states = []; return; }
    this.directory.states(countryCode).subscribe({
      next: states => {
        this.states = states;
        this.form.stateProvinceId = states.some(s => s.id === keep) ? keep : null;
      },
      error: () => { this.states = []; }
    });
  }

  private fetchRates() {
    if (!this.vendorId) return;
    this.api.rates(this.vendorId).subscribe({
      next: rates => {
        this.rates = rates;
        this.loading = false;
        this.loadStateNames(rates);
      },
      error: err => this.fail(err)
    });
  }

  /** The list names states, so the states of the countries that rates use are loaded once each. */
  private loadStateNames(rates: ShippingRate[]) {
    const codes = [...new Set(rates.filter(r => r.stateProvinceId !== null).map(r => r.countryCode))];
    for (const code of codes) {
      this.directory.states(code).subscribe({
        next: states => { for (const s of states) this.stateNames.set(s.id, s.name); this.stateNames = new Map(this.stateNames); },
        error: () => { /* the list then shows the country only */ }
      });
    }
  }

  private fail(err: unknown) {
    this.loading = false;
    this.loadError = vendorErrorMessage(err as never, this.transloco.translate('vendor.shipping.errors.load'));
  }
}
