import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorApplicationResponse } from '../../core/vendors/vendor.models';

interface ApplicationForm {
  shopName: string;
  email: string;
  phoneNumber: string;
  description: string;
  taxCode: string;
  businessAddress: string;
}

type ViewState = 'loading' | 'error' | 'unverified' | 'form' | 'pending' | 'rejected' | 'approved' | 'member';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="become-title">
      <div class="eyebrow">{{ t('becomeVendor.eyebrow') }}</div>
      <h1 id="become-title">{{ t('becomeVendor.title') }}</h1>
      <p>{{ t('becomeVendor.lede') }}</p>
    </section>

    <div class="panel">
      @switch (state) {
        @case ('loading') { <p class="state">{{ t('common.states.loading') }}</p> }
        @case ('error') {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
          </div>
        }
        @case ('member') {
          <div class="panel-body">
            <p class="banner banner-info">{{ t('errors.vendor_application.already_vendor') }}</p>
            <div class="actions"><a class="btn" routerLink="/vendor">{{ t('becomeVendor.openPortal') }}</a></div>
          </div>
        }
        @case ('unverified') {
          <div class="panel-body">
            <p class="banner" role="status">{{ t('errors.vendor_application.email_not_verified') }}</p>
            @if (verificationMessage) { <p class="banner banner-ok" role="status">{{ verificationMessage }}</p> }
            <div class="actions">
              <button type="button" class="btn" (click)="resendVerification()" [disabled]="busy">{{ t('becomeVendor.resendVerification') }}</button>
            </div>
          </div>
        }
        @case ('approved') {
          <div class="panel-body">
            <p class="banner banner-ok" role="status">{{ t('becomeVendor.approved') }}</p>
            <div class="actions"><a class="btn" routerLink="/vendor">{{ t('becomeVendor.openPortal') }}</a></div>
          </div>
        }
        @case ('pending') {
          @if (!editing) {
            <div class="panel-header"><h2>{{ t('becomeVendor.pendingHeading') }}</h2><span class="badge badge-pending">{{ t('vendorStatus.application.pending') }}</span></div>
            <div class="panel-body">
              <dl class="detail-grid">
                <dt>{{ t('becomeVendor.fields.shopName') }}</dt><dd>{{ application!.shopName }}</dd>
                <dt>{{ t('vendor.portal.contactEmail') }}</dt><dd>{{ application!.email }}</dd>
                <dt>{{ t('customer.fields.phone') }}</dt><dd>{{ application!.phoneNumber }}</dd>
                <dt>{{ t('adminVendorApplications.taxCode') }}</dt><dd>{{ application!.taxCode || '—' }}</dd>
                <dt>{{ t('adminVendorApplications.businessAddress') }}</dt><dd>{{ application!.businessAddress || '—' }}</dd>
                <dt>{{ t('admin.common.description') }}</dt><dd>{{ application!.description || '—' }}</dd>
                <dt>{{ t('adminVendorApplications.submitted') }}</dt><dd>{{ application!.createdOnUtc | date:'dd/MM/yyyy HH:mm' }}</dd>
              </dl>
              @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
              @if (confirmCancel) {
                <div class="confirm confirm-danger" role="alertdialog" [attr.aria-label]="t('becomeVendor.confirmCancelLabel')">
                  <span>{{ t('becomeVendor.confirmCancel') }}</span>
                  <div class="actions">
                    <button type="button" class="btn btn-danger" (click)="cancel()" [disabled]="busy">{{ t('becomeVendor.yesCancel') }}</button>
                    <button type="button" class="btn btn-secondary" (click)="confirmCancel = false">{{ t('becomeVendor.keep') }}</button>
                  </div>
                </div>
              } @else {
                <div class="actions">
                  <button type="button" class="btn" (click)="startEdit()">{{ t('common.actions.edit') }}</button>
                  <button type="button" class="btn btn-danger" (click)="confirmCancel = true">{{ t('becomeVendor.cancelApplication') }}</button>
                </div>
              }
            </div>
          }
        }
        @case ('rejected') {
          <div class="panel-header"><h2>{{ t('becomeVendor.rejectedHeading') }}</h2><span class="badge badge-rejected">{{ t('vendorStatus.application.rejected') }}</span></div>
          <div class="panel-body">
            <p class="banner" role="status"><strong>{{ t('becomeVendor.reason') }}</strong> {{ application!.rejectReason }}</p>
            <div class="actions"><button type="button" class="btn" (click)="startReapply()">{{ t('becomeVendor.applyAgain') }}</button></div>
          </div>
        }
      }

      @if (showForm) {
        <div class="panel-header"><h2>{{ editing ? t('becomeVendor.editHeading') : t('becomeVendor.formHeading') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="submit()" novalidate>
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
          <label>{{ t('becomeVendor.fields.shopName') }} *
            <input type="text" name="shopName" [(ngModel)]="form.shopName" maxlength="400" required />
            @if (fieldError('shopName')) { <span class="field-error">{{ fieldError('shopName') }}</span> }
          </label>
          <div class="form-row">
            <label>{{ t('vendor.portal.contactEmail') }} *
              <input type="email" name="email" [(ngModel)]="form.email" maxlength="320" required />
              @if (fieldError('email')) { <span class="field-error">{{ fieldError('email') }}</span> }
            </label>
            <label>{{ t('becomeVendor.fields.phoneNumber') }} *
              <input type="tel" name="phoneNumber" [(ngModel)]="form.phoneNumber" maxlength="50" required />
              @if (fieldError('phoneNumber')) { <span class="field-error">{{ fieldError('phoneNumber') }}</span> }
            </label>
          </div>
          <label>{{ t('admin.common.description') }}
            <textarea name="description" rows="3" [(ngModel)]="form.description"></textarea>
          </label>
          <div class="form-row">
            <label>{{ t('adminVendorApplications.taxCode') }}
              <input type="text" name="taxCode" [(ngModel)]="form.taxCode" maxlength="50" />
              @if (fieldError('taxCode')) { <span class="field-error">{{ fieldError('taxCode') }}</span> }
            </label>
            <label>{{ t('adminVendorApplications.businessAddress') }}
              <input type="text" name="businessAddress" [(ngModel)]="form.businessAddress" maxlength="1000" />
              @if (fieldError('businessAddress')) { <span class="field-error">{{ fieldError('businessAddress') }}</span> }
            </label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy || !canSubmit()">{{ busy ? t('common.states.saving') : (editing ? t('becomeVendor.saveChanges') : t('becomeVendor.submit')) }}</button>
            @if (editing) { <button type="button" class="btn btn-secondary" (click)="editing = false">{{ t('common.actions.cancel') }}</button> }
          </div>
        </form>
      }
    </div>
    </ng-container>
  `
})
export class BecomeVendorPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);
  private readonly transloco = inject(TranslocoService);

  state: ViewState = 'loading';
  application: VendorApplicationResponse | null = null;
  form: ApplicationForm = this.emptyForm();
  editing = false;
  reapplying = false;
  confirmCancel = false;
  busy = false;
  loadError = '';
  actionError = '';
  verificationMessage = '';
  fieldErrors: Record<string, string[]> = {};

  get showForm() {
    return this.state === 'form' || this.editing || (this.state === 'rejected' && this.reapplying);
  }

  ngOnInit() { this.load(); }

  load() {
    this.state = 'loading';
    // The cached session may predate an approval (or removal), so always re-read it here.
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        if (session.vendorId) { this.state = 'member'; return; }
        if (session.emailVerified === false) { this.state = 'unverified'; return; }
        this.loadApplication();
      },
      error: () => this.fail(this.transloco.translate('vendor.portal.errors.loadAccount'))
    });
  }

  private loadApplication() {
    this.api.getApplications({ pageSize: 1 }).subscribe({
      next: res => {
        this.application = res.items[0] ?? null;
        this.editing = false;
        this.reapplying = false;
        switch (this.application?.status) {
          case 'pending': this.state = 'pending'; break;
          case 'rejected': this.state = 'rejected'; break;
          case 'approved': this.state = 'approved'; break;
          default:
            // No application, or the latest one was cancelled.
            this.form = this.emptyForm();
            this.state = 'form';
        }
      },
      error: err => this.fail(vendorErrorMessage(err, this.transloco.translate('becomeVendor.errors.load')))
    });
  }

  resendVerification() {
    const email = this.auth.session()?.email;
    if (!email) return;
    this.busy = true;
    this.auth.sendEmailVerification(email).subscribe({
      next: () => { this.busy = false; this.verificationMessage = this.transloco.translate('becomeVendor.verificationSent'); },
      error: () => { this.busy = false; this.verificationMessage = ''; this.actionError = this.transloco.translate('becomeVendor.errors.sendEmail'); }
    });
  }

  startEdit() {
    const a = this.application!;
    this.form = this.formFrom(a);
    this.clearErrors();
    this.editing = true;
  }

  startReapply() {
    this.form = this.formFrom(this.application!);
    this.clearErrors();
    this.reapplying = true;
  }

  canSubmit() {
    return !!(this.form.shopName.trim() && this.form.email.trim() && this.form.phoneNumber.trim());
  }

  submit() {
    if (!this.canSubmit()) return;
    this.busy = true;
    this.clearErrors();
    const body = {
      shopName: this.form.shopName,
      email: this.form.email,
      phoneNumber: this.form.phoneNumber,
      description: this.form.description || null,
      taxCode: this.form.taxCode || null,
      businessAddress: this.form.businessAddress || null
    };
    const request = this.editing
      ? this.api.updateApplication(this.application!.id, body)
      : this.api.submitApplication(body);
    request.subscribe({
      next: saved => {
        this.busy = false;
        this.application = saved;
        this.editing = false;
        this.reapplying = false;
        this.state = 'pending';
      },
      error: err => {
        this.busy = false;
        this.fieldErrors = err?.fieldErrors ?? {};
        this.actionError = Object.keys(this.fieldErrors).length ? '' : vendorErrorMessage(err, this.transloco.translate('becomeVendor.errors.save'));
        // The application changed under us (already processed or already pending): show the real state.
        if (err?.status === 409) this.loadApplication();
      }
    });
  }

  cancel() {
    this.busy = true;
    this.actionError = '';
    this.api.changeApplicationStatus(this.application!.id, { status: 'cancelled' }).subscribe({
      next: () => { this.busy = false; this.confirmCancel = false; this.form = this.emptyForm(); this.application = null; this.state = 'form'; },
      error: err => {
        this.busy = false;
        this.confirmCancel = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('becomeVendor.errors.cancel'));
        if (err?.status === 409) this.loadApplication();
      }
    });
  }

  fieldError(field: string) {
    return this.fieldErrors[field]?.[0] ?? this.fieldErrors[field.charAt(0).toUpperCase() + field.slice(1)]?.[0] ?? '';
  }

  private fail(message: string) { this.loadError = message; this.state = 'error'; }

  private clearErrors() { this.actionError = ''; this.fieldErrors = {}; }

  private formFrom(a: VendorApplicationResponse): ApplicationForm {
    return {
      shopName: a.shopName, email: a.email, phoneNumber: a.phoneNumber,
      description: a.description ?? '', taxCode: a.taxCode ?? '', businessAddress: a.businessAddress ?? ''
    };
  }

  private emptyForm(): ApplicationForm {
    return { shopName: '', email: '', phoneNumber: '', description: '', taxCode: '', businessAddress: '' };
  }
}
