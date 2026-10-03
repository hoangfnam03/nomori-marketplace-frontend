import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorResponse } from '../../core/vendors/vendor.models';
import { MediaImageFieldComponent } from '../../shared/components/media-image-field/media-image-field.component';

interface ShopForm {
  name: string;
  email: string;
  phoneNumber: string;
  description: string;
  taxCode: string;
  businessAddress: string;
  pictureId: number;
}

/** Shop settings (vendor-shop-settings US-A1, A2): a member edits the profile and logo of their own shop. */
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, TranslocoDirective, MediaImageFieldComponent],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="settings-title">
      <div class="eyebrow">{{ t('vendor.portal.eyebrow') }}</div>
      <h1 id="settings-title">{{ t('vendor.settings.title') }}</h1>
      <p>{{ t('vendor.settings.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    <div class="panel">
      @if (loading) {
        <p class="state">{{ t('vendor.portal.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (!vendor) {
        <div class="panel-body">
          <p class="banner banner-info">{{ t('vendor.portal.noShop') }}</p>
          <div class="actions"><a class="btn" routerLink="/customer/become-vendor">{{ t('vendor.portal.apply') }}</a></div>
        </div>
      } @else {
        <div class="panel-header"><h2>{{ t('vendor.portal.details') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="save()" [attr.aria-label]="t('vendor.settings.title')" novalidate>
          @if (locked) { <p class="banner" role="alert">{{ t('vendor.settings.locked') }}</p> }
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
          @if (saved) { <p class="banner banner-info" role="status">{{ t('vendor.settings.saved') }}</p> }

          <fieldset [disabled]="locked || saving">
            <app-media-image-field [label]="t('vendor.settings.logo')" purpose="vendorLogo" [vendorId]="vendor.id" [(pictureId)]="form.pictureId" />
            <span class="hint">{{ t('vendor.settings.logoHint') }}</span>
            @if (fieldError('pictureId')) { <span class="field-error">{{ fieldError('pictureId') }}</span> }

            <div class="form-row">
              <label>{{ t('becomeVendor.fields.shopName') }} *
                <input type="text" name="name" [(ngModel)]="form.name" maxlength="400" required />
                @if (fieldError('name')) { <span class="field-error">{{ fieldError('name') }}</span> }
              </label>
              <label>{{ t('vendor.portal.contactEmail') }} *
                <input type="email" name="email" [(ngModel)]="form.email" maxlength="320" required />
                @if (fieldError('email')) { <span class="field-error">{{ fieldError('email') }}</span> }
              </label>
            </div>
            <div class="form-row">
              <label>{{ t('becomeVendor.fields.phoneNumber') }} *
                <input type="tel" name="phoneNumber" [(ngModel)]="form.phoneNumber" maxlength="50" required />
                @if (fieldError('phoneNumber')) { <span class="field-error">{{ fieldError('phoneNumber') }}</span> }
              </label>
              <label>{{ t('adminVendorApplications.taxCode') }}
                <input type="text" name="taxCode" [(ngModel)]="form.taxCode" maxlength="50" />
                @if (fieldError('taxCode')) { <span class="field-error">{{ fieldError('taxCode') }}</span> }
              </label>
            </div>
            <label>{{ t('adminVendorApplications.businessAddress') }}
              <input type="text" name="businessAddress" [(ngModel)]="form.businessAddress" maxlength="1000" />
              @if (fieldError('businessAddress')) { <span class="field-error">{{ fieldError('businessAddress') }}</span> }
            </label>
            <label>{{ t('admin.common.description') }}
              <textarea name="description" [(ngModel)]="form.description" rows="4"></textarea>
            </label>
            <span class="hint">{{ t('vendor.settings.privateHint') }}</span>
          </fieldset>

          <div class="actions">
            <button type="submit" class="btn" [disabled]="locked || saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
            <a class="btn btn-secondary" [routerLink]="['/storefront/vendors', vendor.id]">{{ t('vendor.portal.viewPublic') }}</a>
          </div>
        </form>
      }
    </div>
    </ng-container>
  `,
  styles: [`
    fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 1rem; min-width: 0; }
    .hint { color: var(--muted, #6b6b6b); font-size: .8rem; }
  `]
})
export class VendorSettingsPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);
  private readonly transloco = inject(TranslocoService);

  vendor: VendorResponse | null = null;
  form: ShopForm = VendorSettingsPage.toForm(null);
  loading = true;
  loadError = '';
  saving = false;
  saved = false;
  actionError = '';
  fieldErrors: Record<string, string[]> = {};

  /** An administrator switched the shop off; members cannot change it until it is back on. */
  get locked() { return this.vendor?.active === false; }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        if (!session.vendorId) { this.vendor = null; this.loading = false; return; }
        this.api.getVendor(session.vendorId).subscribe({
          next: vendor => { this.show(vendor); this.loading = false; },
          error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('vendor.portal.errors.loadShop')); }
        });
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  save() {
    if (!this.vendor || this.locked) return;
    this.saved = false;
    this.actionError = '';
    this.fieldErrors = {};
    const required = this.transloco.translate('vendor.settings.required');
    for (const field of ['name', 'email', 'phoneNumber'] as const) {
      if (!this.form[field].trim()) this.fieldErrors[field] = [required];
    }
    if (Object.keys(this.fieldErrors).length) return;

    this.saving = true;
    this.api.updateVendor(this.vendor.id, {
      name: this.form.name,
      email: this.form.email,
      phoneNumber: this.form.phoneNumber,
      description: this.form.description || null,
      taxCode: this.form.taxCode || null,
      businessAddress: this.form.businessAddress || null,
      pictureId: this.form.pictureId
    }).subscribe({
      next: vendor => { this.saving = false; this.saved = true; this.show(vendor); },
      error: err => {
        this.saving = false;
        if (err?.status === 400 && err.fieldErrors) { this.fieldErrors = err.fieldErrors; return; }
        this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.common.saveFailed'));
      }
    });
  }

  fieldError(field: string) {
    return this.fieldErrors[field]?.[0] ?? '';
  }

  private show(vendor: VendorResponse) {
    this.vendor = vendor;
    this.form = VendorSettingsPage.toForm(vendor);
  }

  private static toForm(v: VendorResponse | null): ShopForm {
    return {
      name: v?.name ?? '',
      email: v?.email ?? '',
      phoneNumber: v?.phoneNumber ?? '',
      description: v?.description ?? '',
      taxCode: v?.taxCode ?? '',
      businessAddress: v?.businessAddress ?? '',
      pictureId: v?.pictureId ?? 0
    };
  }
}
