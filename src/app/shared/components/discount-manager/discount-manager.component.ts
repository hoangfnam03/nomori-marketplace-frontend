import { Component, inject, Input, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DiscountApiService } from '../../../core/discounts/discount-api.service';
import { Discount, DiscountType, SaveDiscountRequest } from '../../../core/discounts/discount.models';
import { CurrencyService } from '../../../core/money/currency.service';
import { vendorErrorMessage } from '../../../core/vendors/vendor-errors';

interface DiscountForm {
  name: string;
  code: string;
  type: DiscountType;
  value: number | null;
  maxDiscountAmount: number | null;
  startsOn: string;
  endsOn: string;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  enabled: boolean;
}

const emptyForm = (): DiscountForm => ({
  name: '', code: '', type: 'percentage', value: 10, maxDiscountAmount: null, startsOn: '', endsOn: '',
  minSubtotal: null, maxUses: null, maxUsesPerCustomer: null, enabled: true
});

/** "2026-01-31T10:30" typed by a person is read as UTC (the form says so) and sent as an instant. */
const toUtc = (local: string) => (local ? (local.length === 16 ? `${local}:00Z` : `${local}Z`) : null);
const toLocal = (utc: string | null) => (utc ? utc.slice(0, 16) : '');

/**
 * The discounts of one scope: the shop of the signed-in member (vendorId set) or the platform (vendorId null, administrators).
 * Who funds a discount is decided by where it is created, so the form has no such field.
 */
@Component({
  selector: 'app-discount-manager',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslocoDirective],
  styleUrls: ['../../styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('discounts.list') }}</h2>
        <button type="button" class="btn btn-small" (click)="startCreate()" [disabled]="busy">{{ t('discounts.add') }}</button>
      </div>
      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (items.length === 0) {
        <p class="state">{{ vendorId ? t('discounts.emptyShop') : t('discounts.emptyPlatform') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>{{ t('discounts.code') }}</th><th>{{ t('discounts.discount') }}</th><th>{{ t('discounts.validity') }}</th>
              <th>{{ t('discounts.uses') }}</th><th>{{ t('admin.common.status') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (d of items; track d.id) {
                <tr>
                  <td><strong>{{ d.code }}</strong><div class="muted">{{ d.name }}</div></td>
                  <td>
                    {{ d.type === 'percentage' ? d.value + '%' : money(d.value) }}
                    @if (d.maxDiscountAmount !== null) { <div class="muted">{{ t('discounts.upTo', { amount: money(d.maxDiscountAmount) }) }}</div> }
                    @if (d.minSubtotal !== null) { <div class="muted">{{ t('discounts.minimum', { amount: money(d.minSubtotal) }) }}</div> }
                  </td>
                  <td>
                    @if (d.startsOnUtc || d.endsOnUtc) {
                      {{ d.startsOnUtc ? (d.startsOnUtc | date: 'short') : '…' }} → {{ d.endsOnUtc ? (d.endsOnUtc | date: 'short') : '…' }}
                    } @else { — }
                  </td>
                  <td>
                    {{ d.usedCount }}{{ d.maxUses !== null ? ' / ' + d.maxUses : '' }}
                    @if (d.maxUsesPerCustomer !== null) { <div class="muted">{{ t('discounts.perCustomerShort', { count: d.maxUsesPerCustomer }) }}</div> }
                  </td>
                  <td><span class="badge" [class.badge-active]="d.enabled">{{ d.enabled ? t('discounts.enabled') : t('discounts.disabled') }}</span></td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn btn-secondary btn-small" (click)="startEdit(d)" [disabled]="busy">{{ t('common.actions.edit') }}</button>
                      @if (pendingDelete?.id === d.id) {
                        <button type="button" class="btn btn-danger btn-small" (click)="remove(d)" [disabled]="busy">{{ t('discounts.confirmDelete') }}</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingDelete = null">{{ t('common.actions.cancel') }}</button>
                      } @else {
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingDelete = d" [disabled]="busy">{{ t('common.actions.delete') }}</button>
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
        <div class="panel-header"><h2>{{ editingId ? t('discounts.editHeading') : t('discounts.addHeading') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="save()" novalidate>
          <p class="muted">{{ vendorId ? t('discounts.fundedByShop') : t('discounts.fundedByPlatform') }}</p>
          @if (formError) { <p class="banner" role="alert">{{ formError }}</p> }
          <div class="form-row">
            <label>{{ t('discounts.name') }} *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="100" required />
              @if (fieldError('name'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <label>{{ t('discounts.code') }} *
              <input type="text" name="code" [(ngModel)]="form.code" maxlength="32" required autocapitalize="characters" />
              <span class="hint">{{ t('discounts.codeHint') }}</span>
              @if (fieldError('code'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
          </div>
          <div class="form-row">
            <label>{{ t('discounts.type') }}
              <select name="type" [(ngModel)]="form.type">
                <option value="percentage">{{ t('discounts.typePercentage') }}</option>
                <option value="fixed">{{ t('discounts.typeFixed') }}</option>
              </select>
              @if (fieldError('type'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <label>{{ form.type === 'percentage' ? t('discounts.valuePercent') : t('discounts.valueAmount', { code: currency.primary().code }) }} *
              <input type="number" name="value" [(ngModel)]="form.value" min="0" [step]="form.type === 'percentage' ? 0.01 : currency.step()" required />
              @if (fieldError('value'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            @if (form.type === 'percentage') {
              <label>{{ t('discounts.cap', { code: currency.primary().code }) }}
                <input type="number" name="maxDiscountAmount" [(ngModel)]="form.maxDiscountAmount" min="0" [step]="currency.step()" />
                @if (fieldError('maxDiscountAmount'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
            }
          </div>
          <div class="form-row">
            <label>{{ t('discounts.startsOn') }}
              <input type="datetime-local" name="startsOn" [(ngModel)]="form.startsOn" />
            </label>
            <label>{{ t('discounts.endsOn') }}
              <input type="datetime-local" name="endsOn" [(ngModel)]="form.endsOn" />
              @if (fieldError('endsOnUtc'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
          </div>
          <div class="form-row">
            <label>{{ t('discounts.minSubtotal', { code: currency.primary().code }) }}
              <input type="number" name="minSubtotal" [(ngModel)]="form.minSubtotal" min="0" [step]="currency.step()" />
              @if (fieldError('minSubtotal'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <label>{{ t('discounts.maxUses') }}
              <input type="number" name="maxUses" [(ngModel)]="form.maxUses" min="1" step="1" />
              @if (fieldError('maxUses'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
            <label>{{ t('discounts.maxUsesPerCustomer') }}
              <input type="number" name="maxUsesPerCustomer" [(ngModel)]="form.maxUsesPerCustomer" min="1" step="1" />
              @if (fieldError('maxUsesPerCustomer'); as e) { <span class="field-error">{{ e }}</span> }
            </label>
          </div>
          <p class="muted">{{ t('discounts.utcNote') }}</p>
          <label class="check-label"><input type="checkbox" name="enabled" [(ngModel)]="form.enabled" /> {{ t('discounts.enabledLabel') }}</label>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ busy ? t('common.states.saving') : t('common.actions.save') }}</button>
            <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="busy">{{ t('common.actions.cancel') }}</button>
          </div>
        </form>
      </div>
    }
    </ng-container>
  `
})
export class DiscountManagerComponent implements OnInit {
  private readonly api = inject(DiscountApiService);
  private readonly transloco = inject(TranslocoService);
  protected readonly currency = inject(CurrencyService);

  /** The shop whose discounts are managed; null for the platform's. */
  @Input() vendorId: number | null = null;

  items: Discount[] = [];
  loading = true;
  loadError = '';
  busy = false;
  notice = '';
  actionError = '';
  formError = '';
  fieldErrors: Record<string, string[]> = {};
  editing = false;
  editingId: number | null = null;
  form: DiscountForm = emptyForm();
  pendingDelete: Discount | null = null;

  ngOnInit() {
    this.currency.load();
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.list(this.vendorId).subscribe({
      next: items => { this.items = items; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('discounts.errors.load')); }
    });
  }

  startCreate() { this.open(null, emptyForm()); }

  startEdit(d: Discount) {
    this.open(d.id, {
      name: d.name, code: d.code, type: d.type, value: d.value, maxDiscountAmount: d.maxDiscountAmount, startsOn: toLocal(d.startsOnUtc),
      endsOn: toLocal(d.endsOnUtc), minSubtotal: d.minSubtotal, maxUses: d.maxUses, maxUsesPerCustomer: d.maxUsesPerCustomer, enabled: d.enabled
    });
  }

  cancel() { this.editing = false; this.editingId = null; this.formError = ''; this.fieldErrors = {}; }

  save() {
    const f = this.form;
    if (!f.name.trim() || !f.code.trim() || f.value === null) {
      this.formError = this.transloco.translate('discounts.errors.required');
      return;
    }
    const body: SaveDiscountRequest = {
      name: f.name.trim(), code: f.code.trim().toUpperCase(), type: f.type, value: f.value,
      maxDiscountAmount: f.type === 'percentage' ? f.maxDiscountAmount || null : null,
      startsOnUtc: toUtc(f.startsOn), endsOnUtc: toUtc(f.endsOn),
      minSubtotal: f.minSubtotal || null, maxUses: f.maxUses || null, maxUsesPerCustomer: f.maxUsesPerCustomer || null, enabled: f.enabled
    };
    this.busy = true;
    this.formError = '';
    this.fieldErrors = {};
    this.notice = '';
    const request = this.editingId ? this.api.update(this.vendorId, this.editingId, body) : this.api.create(this.vendorId, body);
    request.subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('discounts.saved'); this.cancel(); this.load(); },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.status === 400 && err?.fieldErrors ? err.fieldErrors : {};
        this.formError = Object.keys(this.fieldErrors).length > 0 ? '' : vendorErrorMessage(err, this.transloco.translate('discounts.errors.save'));
      }
    });
  }

  remove(d: Discount) {
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.delete(this.vendorId, d.id).subscribe({
      next: () => { this.busy = false; this.pendingDelete = null; this.load(); },
      error: err => {
        this.busy = false;
        this.pendingDelete = null;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('discounts.errors.delete'));
        // Already gone, or used meanwhile: show the list as it is now.
        if (err?.status === 404 || err?.status === 409) this.load();
      }
    });
  }

  private open(id: number | null, form: DiscountForm) {
    this.editing = true;
    this.editingId = id;
    this.form = form;
    this.formError = '';
    this.fieldErrors = {};
    this.notice = '';
  }
}
