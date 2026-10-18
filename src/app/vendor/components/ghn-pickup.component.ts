import { Component, inject, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { GhnApiService, GhnPickup, GhnProvince, GhnWard } from '../../core/shipping/ghn-api.service';
import { CurrencyService } from '../../core/money/currency.service';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { ApiError, vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface PickupForm {
  contactName: string;
  phone: string;
  address: string;
  provinceId: number | null;
  wardId: number | null;
  freeShippingOverSubtotal: number | null;
}

const emptyForm = (): PickupForm => ({ contactName: '', phone: '', address: '', provinceId: null, wardId: null, freeShippingOverSubtotal: null });

/**
 * GHN (prototype): where GHN picks up this shop's parcels. With an address the shop's customers get a GHN option priced from here, and
 * "Ship with GHN" sends the driver here; without one the shop has no GHN. Hidden when the server has no GHN.
 */
@Component({
  selector: 'app-ghn-pickup',
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    @if (enabled) {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('vendor.ghn.title') }}</h2>
          @if (pickup && !editing) {
            <div class="actions">
              <button type="button" class="btn btn-secondary btn-small" (click)="edit()" [disabled]="busy">{{ t('vendor.ghn.edit') }}</button>
              <button type="button" class="btn btn-danger btn-small" (click)="remove()" [disabled]="busy">{{ t('vendor.ghn.turnOff') }}</button>
            </div>
          }
        </div>
        <div class="panel-body">
          @if (error) { <p class="banner" role="alert">{{ error }}</p> }
          @if (pickup && !editing) {
            <p class="state ghn-on">{{ t('vendor.ghn.on') }}</p>
            <p>{{ pickup.contactName }} · {{ pickup.phone }}<br />{{ pickup.address }}, {{ pickup.wardName }}, {{ pickup.provinceName }}</p>
            <p class="free">
              @if (pickup.freeShippingOverSubtotal !== null) {
                {{ t('vendor.ghn.freeOn', { amount: money(pickup.freeShippingOverSubtotal) }) }}
              } @else {
                {{ t('vendor.ghn.freeOff') }}
              }
            </p>
          } @else if (!editing) {
            <p class="state">{{ t('vendor.ghn.off') }}</p>
            <div class="actions"><button type="button" class="btn btn-small" (click)="edit()" [disabled]="busy">{{ t('vendor.ghn.turnOn') }}</button></div>
          } @else {
            <form class="form" (ngSubmit)="save()" novalidate>
              <p class="hint">{{ t('vendor.ghn.hint') }}</p>
              <div class="form-row">
                <label>{{ t('vendor.ghn.contactName') }}
                  <input type="text" name="contactName" [(ngModel)]="form.contactName" maxlength="100" />
                  @if (fieldError('contactName'); as e) { <span class="field-error">{{ e }}</span> }
                </label>
                <label>{{ t('vendor.ghn.phone') }}
                  <input type="tel" name="phone" [(ngModel)]="form.phone" maxlength="20" />
                  @if (fieldError('phone'); as e) { <span class="field-error">{{ e }}</span> }
                </label>
              </div>
              <div class="form-row">
                <label>{{ t('vendor.ghn.province') }}
                  <select name="provinceId" [(ngModel)]="form.provinceId" (ngModelChange)="onProvince()">
                    <option [ngValue]="null">{{ t('vendor.ghn.choose') }}</option>
                    @for (p of provinces; track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
                  </select>
                </label>
                <label>{{ t('vendor.ghn.ward') }}
                  <select name="wardId" [(ngModel)]="form.wardId" [disabled]="!form.provinceId">
                    <option [ngValue]="null">{{ t('vendor.ghn.choose') }}</option>
                    @for (w of wards; track w.id) { <option [ngValue]="w.id">{{ w.name }}</option> }
                  </select>
                  @if (fieldError('wardId'); as e) { <span class="field-error">{{ e }}</span> }
                </label>
              </div>
              <label>{{ t('vendor.ghn.address') }}
                <input type="text" name="address" [(ngModel)]="form.address" maxlength="200" />
                @if (fieldError('address'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              <label>{{ t('vendor.ghn.freeShipping') }}
                <input type="number" name="freeShippingOverSubtotal" [(ngModel)]="form.freeShippingOverSubtotal" min="0" step="any" />
                <span class="hint">{{ t('vendor.ghn.freeShippingHint') }}</span>
                @if (fieldError('freeShippingOverSubtotal'); as e) { <span class="field-error">{{ e }}</span> }
              </label>
              <div class="actions">
                <button type="submit" class="btn" [disabled]="busy">{{ t('vendor.ghn.save') }}</button>
                <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="busy">{{ t('common.actions.cancel') }}</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
    </ng-container>
  `,
  styles: [`.ghn-on { color: #205e4a; font-weight: 600; padding: 0; } .hint { color: var(--muted); font-size: .85rem; margin: 0; font-weight: 400; } .free { margin: 0; color: var(--muted); }`]
})
export class GhnPickupComponent implements OnChanges {
  private readonly ghn = inject(GhnApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly vendors = inject(VendorApiService);
  private readonly currency = inject(CurrencyService);

  @Input() vendorId: number | null = null;

  enabled = false;
  pickup: GhnPickup | null = null;
  editing = false;
  busy = false;
  error = '';
  fieldErrors: Record<string, string[]> = {};
  form: PickupForm = emptyForm();
  provinces: GhnProvince[] = [];
  wards: GhnWard[] = [];

  ngOnChanges() {
    if (!this.vendorId) return;
    this.currency.load();
    this.ghn.pickup(this.vendorId).subscribe({
      next: state => { this.enabled = state.enabled; this.pickup = state.pickup; },
      error: () => { this.enabled = false; }
    });
  }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  money(value: number) { return this.currency.formatPrimary(value); }

  edit() {
    this.editing = true;
    this.error = '';
    this.fieldErrors = {};
    const p = this.pickup;
    this.form = p
      ? { contactName: p.contactName, phone: p.phone, address: p.address, provinceId: p.provinceId, wardId: p.wardId,
          freeShippingOverSubtotal: p.freeShippingOverSubtotal }
      : emptyForm();
    // A first address starts from the shop itself: its name goes on the label as the sender, its phone is the one the driver calls.
    if (!p && this.vendorId) {
      this.vendors.getVendor(this.vendorId).subscribe({
        next: shop => {
          if (!this.form.contactName) this.form.contactName = shop.name;
          if (!this.form.phone) this.form.phone = shop.phoneNumber ?? '';
        }
      });
    }
    this.wards = [];
    if (!this.provinces.length) this.ghn.provinces().subscribe({ next: list => this.provinces = list, error: err => this.fail(err) });
    if (p) {
      this.ghn.wards(p.provinceId).subscribe({ next: list => this.wards = list });
    }
  }

  onProvince() {
    this.form.wardId = null;
    this.wards = [];
    if (this.form.provinceId) this.ghn.wards(this.form.provinceId).subscribe({ next: list => this.wards = list, error: err => this.fail(err) });
  }

  save() {
    if (!this.vendorId) return;
    const f = this.form;
    this.busy = true;
    this.error = '';
    this.fieldErrors = {};
    this.ghn.savePickup(this.vendorId, {
      contactName: f.contactName.trim(), phone: f.phone.trim(), address: f.address.trim(),
      provinceId: f.provinceId ?? 0, provinceName: this.provinces.find(p => p.id === f.provinceId)?.name ?? null,
      wardId: f.wardId ?? 0, wardName: this.wards.find(w => w.id === f.wardId)?.name ?? null,
      // An empty box (or 0) means no free shipping.
      freeShippingOverSubtotal: f.freeShippingOverSubtotal ? Number(f.freeShippingOverSubtotal) : null
    }).subscribe({
      next: pickup => { this.busy = false; this.pickup = pickup; this.editing = false; },
      error: err => {
        this.busy = false;
        if (err?.status === 400 && err?.fieldErrors) { this.fieldErrors = err.fieldErrors; return; }
        this.fail(err);
      }
    });
  }

  cancel() { this.editing = false; this.fieldErrors = {}; }

  remove() {
    if (!this.vendorId) return;
    this.busy = true;
    this.ghn.deletePickup(this.vendorId).subscribe({
      next: () => { this.busy = false; this.pickup = null; },
      error: err => { this.busy = false; this.fail(err); }
    });
  }

  private fail(err: ApiError) { this.error = vendorErrorMessage(err, this.transloco.translate('vendor.ghn.error')); }
}
