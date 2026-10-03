import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="currencies-title">
      <div class="eyebrow">{{ t('admin.currencies.eyebrow') }}</div>
      <h1 id="currencies-title">{{ t('admin.currencies.title') }}</h1>
      <p>
        {{ t('admin.currencies.ledePrimary', { code: primary?.code ?? '…' }) }}
        {{ t('admin.currencies.ledeRest') }}
      </p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('nav.currencies') }}</h2>
        <div class="actions"><button type="button" class="btn" (click)="openForm()">+ {{ t('admin.currencies.new') }}</button></div>
      </div>

      @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
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
            <thead><tr><th>{{ t('admin.currencies.code') }}</th><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.currencies.symbol') }}</th><th>{{ t('admin.currencies.decimals') }}</th><th>{{ t('admin.currencies.rate') }}</th><th>{{ t('admin.common.order') }}</th><th>{{ t('admin.common.status') }}</th><th>{{ t('admin.currencies.rateUpdated') }}</th><th></th></tr></thead>
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
                    @if (c.isPrimary) { <span class="badge badge-approved">{{ t('admin.currencies.primary') }}</span> }
                    @else if (c.published) { <span class="badge badge-active">{{ t('admin.catalog.published') }}</span> }
                    @else { <span class="badge">{{ t('admin.currencies.hidden') }}</span> }
                  </td>
                  <td>{{ c.rateUpdatedOnUtc | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="row-actions">
                    @if (pendingPrimary?.id === c.id) {
                      <span class="muted">{{ t('admin.currencies.confirmPrimary', { code: c.code }) }}</span>
                      <button type="button" class="btn btn-small" (click)="makePrimary(c)" [disabled]="busy">{{ t('common.actions.confirm') }}</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="pendingPrimary = null">{{ t('common.actions.cancel') }}</button>
                    } @else if (pendingDelete?.id === c.id) {
                      <span class="muted">{{ t('admin.currencies.confirmDelete', { code: c.code }) }}</span>
                      <button type="button" class="btn btn-danger btn-small" (click)="remove(c)" [disabled]="busy">{{ t('common.actions.delete') }}</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">{{ t('common.actions.cancel') }}</button>
                    } @else {
                      <button type="button" class="btn btn-secondary btn-small" (click)="edit(c)">{{ t('common.actions.edit') }}</button>
                      @if (!c.isPrimary) {
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingPrimary = c; pendingDelete = null">{{ t('admin.currencies.makePrimary') }}</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = c; pendingPrimary = null">{{ t('common.actions.delete') }}</button>
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
        <div class="panel-header"><h2>{{ editingId ? t('admin.currencies.edit') : t('admin.currencies.new') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="save()" novalidate>
          @if (formError) { <p class="banner" role="alert">{{ formError }}</p> }
          <div class="form-row">
            <label>{{ t('admin.currencies.code') }} *
              <input type="text" name="code" [(ngModel)]="form.code" maxlength="3" [disabled]="!!editingId" autocapitalize="characters" />
              <span class="hint">{{ t('admin.currencies.codeHint') }}</span>
              @if (fieldError('code')) { <span class="field-error">{{ fieldError('code') }}</span> }
            </label>
            <label>{{ t('admin.common.name') }} *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="100" />
              @if (fieldError('name')) { <span class="field-error">{{ fieldError('name') }}</span> }
            </label>
            <label>{{ t('admin.currencies.symbol') }}
              <input type="text" name="symbol" [(ngModel)]="form.symbol" maxlength="10" />
              <span class="hint">{{ t('admin.currencies.symbolHint') }}</span>
              @if (fieldError('symbol')) { <span class="field-error">{{ fieldError('symbol') }}</span> }
            </label>
          </div>
          <div class="form-row">
            <label>{{ t('admin.currencies.decimalPlaces') }} *
              <input type="number" name="decimalPlaces" [(ngModel)]="form.decimalPlaces" min="0" max="4" step="1" />
              <span class="hint">{{ t('admin.currencies.decimalsHint') }}</span>
              @if (fieldError('decimalPlaces')) { <span class="field-error">{{ fieldError('decimalPlaces') }}</span> }
            </label>
            <label>{{ t('admin.currencies.rate') }} *
              <input type="number" name="rate" [(ngModel)]="form.rate" min="0" step="any" [disabled]="isPrimaryBeingEdited" />
              <span class="hint">@if (isPrimaryBeingEdited) { {{ t('admin.currencies.primaryRate') }} } @else { {{ t('admin.currencies.rateHint', { code: primary?.code }) }} }</span>
              @if (fieldError('rate')) { <span class="field-error">{{ fieldError('rate') }}</span> }
            </label>
            <label>{{ t('admin.common.displayOrder') }}
              <input type="number" name="displayOrder" [(ngModel)]="form.displayOrder" step="1" />
            </label>
          </div>
          <label class="check-label"><input type="checkbox" name="published" [(ngModel)]="form.published" [disabled]="isPrimaryBeingEdited" /> {{ t('admin.currencies.publishedHint') }}</label>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ busy ? t('common.states.saving') : t('admin.currencies.save') }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeForm()">{{ t('common.actions.cancel') }}</button>
          </div>
        </form>
      </div>
    }
    </ng-container>
  `
})
export class AdminCurrenciesPage implements OnInit {
  private readonly api = inject(CurrencyAdminApiService);
  private readonly shared = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

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
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.currencies.errors.load')); }
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
      next: saved => { this.busy = false; this.closeForm(); this.notice = this.transloco.translate('common.notice.saved', { name: saved.code }); this.refresh(); },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.formError = Object.keys(this.fieldErrors).length ? '' : vendorErrorMessage(err, this.transloco.translate('admin.currencies.errors.save'));
      }
    });
  }

  makePrimary(c: Currency) {
    this.busy = true;
    this.clearErrors();
    this.api.makePrimary(c.id).subscribe({
      next: () => { this.busy = false; this.pendingPrimary = null; this.notice = this.transloco.translate('admin.currencies.primaryChanged', { code: c.code }); this.refresh(); },
      error: err => { this.busy = false; this.pendingPrimary = null; this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.currencies.errors.primary')); }
    });
  }

  remove(c: Currency) {
    this.busy = true;
    this.clearErrors();
    this.api.delete(c.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; this.notice = this.transloco.translate('common.notice.deleted', { name: c.code }); this.refresh(); },
      error: err => { this.busy = false; this.pendingDelete = null; this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.currencies.errors.delete')); }
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
