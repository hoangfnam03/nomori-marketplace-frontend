import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Currency, CurrencyService } from '../../core/money/currency.service';
import { CurrencyAdminApiService, SaveCurrencyRequest } from '../../core/money/currency-admin-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface CurrencyForm {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  rate: number;
  published: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="currencies-title">
      <div class="eyebrow">Admin / Settings</div>
      <h1 id="currencies-title">Currencies.</h1>
      <p>
        Every price is stored in the primary currency (<strong>{{ primary?.code ?? '…' }}</strong>). Other published currencies are for display only:
        customers see an approximation and always pay in the primary currency. Rates are units of the currency for one unit of the primary.
      </p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>Currencies</h2>
        <div class="actions"><button type="button" class="btn" (click)="openForm()">+ New currency</button></div>
      </div>

      @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
      @if (loading) {
        <p class="state">Loading…</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
        </div>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th>Decimals</th><th>Rate</th><th>Order</th><th>Status</th><th>Rate updated</th><th></th></tr></thead>
            <tbody>
              @for (c of currencies; track c.id) {
                <tr [class.selected]="editingId === c.id">
                  <td><strong>{{ c.code }}</strong></td>
                  <td>{{ c.name }}</td>
                  <td>{{ c.symbol }}</td>
                  <td>{{ c.decimalPlaces }}</td>
                  <td>{{ c.rate }}</td>
                  <td>{{ c.displayOrder }}</td>
                  <td>
                    @if (c.isPrimary) { <span class="badge badge-approved">Primary</span> }
                    @else if (c.published) { <span class="badge badge-active">Published</span> }
                    @else { <span class="badge">Hidden</span> }
                  </td>
                  <td>{{ c.rateUpdatedOnUtc | date: 'medium' }}</td>
                  <td class="row-actions">
                    @if (pendingPrimary?.id === c.id) {
                      <span class="muted">Make {{ c.code }} the primary currency?</span>
                      <button type="button" class="btn btn-small" (click)="makePrimary(c)" [disabled]="busy">Confirm</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="pendingPrimary = null">Cancel</button>
                    } @else if (pendingDelete?.id === c.id) {
                      <span class="muted">Delete {{ c.code }}?</span>
                      <button type="button" class="btn btn-danger btn-small" (click)="remove(c)" [disabled]="busy">Delete</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">Cancel</button>
                    } @else {
                      <button type="button" class="btn btn-secondary btn-small" (click)="edit(c)">Edit</button>
                      @if (!c.isPrimary) {
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingPrimary = c; pendingDelete = null">Make primary</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = c; pendingPrimary = null">Delete</button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
      }
    </div>

    @if (formOpen) {
      <div class="panel">
        <div class="panel-header"><h2>{{ editingId ? 'Edit currency' : 'New currency' }}</h2></div>
        <form class="form panel-body" (ngSubmit)="save()" novalidate>
          @if (formError) { <p class="banner" role="alert">{{ formError }}</p> }
          <div class="form-row">
            <label>Code *
              <input type="text" name="code" [(ngModel)]="form.code" maxlength="3" [disabled]="!!editingId" autocapitalize="characters" />
              <span class="hint">Three letters, for example EUR. It cannot change later.</span>
              @if (fieldError('code')) { <span class="field-error">{{ fieldError('code') }}</span> }
            </label>
            <label>Name *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="100" />
              @if (fieldError('name')) { <span class="field-error">{{ fieldError('name') }}</span> }
            </label>
            <label>Symbol
              <input type="text" name="symbol" [(ngModel)]="form.symbol" maxlength="10" />
              <span class="hint">Shown before the amount. The code is used when empty.</span>
              @if (fieldError('symbol')) { <span class="field-error">{{ fieldError('symbol') }}</span> }
            </label>
          </div>
          <div class="form-row">
            <label>Decimal places *
              <input type="number" name="decimalPlaces" [(ngModel)]="form.decimalPlaces" min="0" max="4" step="1" />
              <span class="hint">0 for currencies without cents. Prices in the primary currency cannot have more decimals.</span>
              @if (fieldError('decimalPlaces')) { <span class="field-error">{{ fieldError('decimalPlaces') }}</span> }
            </label>
            <label>Rate *
              <input type="number" name="rate" [(ngModel)]="form.rate" min="0" step="any" [disabled]="isPrimaryBeingEdited" />
              <span class="hint">@if (isPrimaryBeingEdited) { The primary currency is always 1. } @else { Units of this currency for 1 {{ primary?.code }}. }</span>
              @if (fieldError('rate')) { <span class="field-error">{{ fieldError('rate') }}</span> }
            </label>
            <label>Display order
              <input type="number" name="displayOrder" [(ngModel)]="form.displayOrder" step="1" />
            </label>
          </div>
          <label class="check-label"><input type="checkbox" name="published" [(ngModel)]="form.published" [disabled]="isPrimaryBeingEdited" /> Published (customers can choose it)</label>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ busy ? 'Saving…' : 'Save currency' }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      </div>
    }
  `
})
export class AdminCurrenciesPage implements OnInit {
  private readonly api = inject(CurrencyAdminApiService);
  private readonly shared = inject(CurrencyService);

  currencies: Currency[] = [];
  loading = true;
  loadError = '';
  notice = '';
  actionError = '';
  busy = false;

  formOpen = false;
  editingId: number | null = null;
  form: CurrencyForm = this.emptyForm();
  formError = '';
  fieldErrors: Record<string, string[]> = {};

  pendingDelete: Currency | null = null;
  pendingPrimary: Currency | null = null;

  get primary(): Currency | undefined { return this.currencies.find(c => c.isPrimary); }
  get isPrimaryBeingEdited() { return !!this.editingId && this.currencies.find(c => c.id === this.editingId)?.isPrimary === true; }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.list().subscribe({
      next: list => { this.currencies = list; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load currencies.'); }
    });
  }

  openForm() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.clearErrors();
    this.formOpen = true;
  }

  edit(c: Currency) {
    this.editingId = c.id;
    this.form = { code: c.code, name: c.name, symbol: c.symbol ?? '', decimalPlaces: c.decimalPlaces, rate: c.rate, published: c.published, displayOrder: c.displayOrder };
    this.clearErrors();
    this.formOpen = true;
  }

  closeForm() { this.formOpen = false; this.editingId = null; this.clearErrors(); }

  save() {
    this.busy = true;
    this.clearErrors();
    const body: SaveCurrencyRequest = {
      name: this.form.name,
      symbol: this.form.symbol.trim() || null,
      decimalPlaces: Number(this.form.decimalPlaces),
      rate: Number(this.form.rate),
      published: this.form.published,
      displayOrder: Number(this.form.displayOrder) || 0
    };
    const request = this.editingId
      ? this.api.update(this.editingId, body)
      : this.api.create({ ...body, code: this.form.code.trim().toUpperCase() });
    request.subscribe({
      next: saved => { this.busy = false; this.closeForm(); this.notice = `${saved.code} saved.`; this.refresh(); },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.formError = Object.keys(this.fieldErrors).length ? '' : vendorErrorMessage(err, 'Unable to save the currency.');
      }
    });
  }

  makePrimary(c: Currency) {
    this.busy = true;
    this.clearErrors();
    this.api.makePrimary(c.id).subscribe({
      next: () => { this.busy = false; this.pendingPrimary = null; this.notice = `${c.code} is now the primary currency. Rates were re-based.`; this.refresh(); },
      error: err => { this.busy = false; this.pendingPrimary = null; this.actionError = vendorErrorMessage(err, 'Unable to change the primary currency.'); }
    });
  }

  remove(c: Currency) {
    this.busy = true;
    this.clearErrors();
    this.api.delete(c.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; this.notice = `${c.code} deleted.`; this.refresh(); },
      error: err => { this.busy = false; this.pendingDelete = null; this.actionError = vendorErrorMessage(err, 'Unable to delete the currency.'); }
    });
  }

  fieldError(field: string) { return this.fieldErrors[field]?.[0] ?? ''; }

  /** Reloads this list and the list the storefront formats with, so the change shows at once. */
  private refresh() {
    this.load();
    this.shared.reload();
  }

  private clearErrors() { this.formError = ''; this.fieldErrors = {}; this.actionError = ''; this.notice = ''; }

  private emptyForm(): CurrencyForm {
    return { code: '', name: '', symbol: '', decimalPlaces: 2, rate: 1, published: true, displayOrder: 0 };
  }
}
