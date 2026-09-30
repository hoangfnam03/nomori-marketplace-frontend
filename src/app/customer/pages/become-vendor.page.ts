import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  imports: [FormsModule, RouterLink, DatePipe],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="become-title">
      <div class="eyebrow">Customer / Sell on Nomori</div>
      <h1 id="become-title">Open your shop.</h1>
      <p>Apply to sell on Nomori Marketplace. An administrator reviews every application.</p>
    </section>

    <div class="panel">
      @switch (state) {
        @case ('loading') { <p class="state">Loading…</p> }
        @case ('error') {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
          </div>
        }
        @case ('member') {
          <div class="panel-body">
            <p class="banner banner-info">Your account already belongs to a shop.</p>
            <div class="actions"><a class="btn" routerLink="/vendor">Open vendor portal</a></div>
          </div>
        }
        @case ('unverified') {
          <div class="panel-body">
            <p class="banner" role="status">Verify your email address before applying to open a shop.</p>
            @if (verificationMessage) { <p class="banner banner-ok" role="status">{{ verificationMessage }}</p> }
            <div class="actions">
              <button type="button" class="btn" (click)="resendVerification()" [disabled]="busy">Resend verification email</button>
            </div>
          </div>
        }
        @case ('approved') {
          <div class="panel-body">
            <p class="banner banner-ok" role="status">Your application was approved.</p>
            <div class="actions"><a class="btn" routerLink="/vendor">Open vendor portal</a></div>
          </div>
        }
        @case ('pending') {
          @if (!editing) {
            <div class="panel-header"><h2>Application waiting for review</h2><span class="badge badge-pending">Pending</span></div>
            <div class="panel-body">
              <dl class="detail-grid">
                <dt>Shop name</dt><dd>{{ application!.shopName }}</dd>
                <dt>Contact email</dt><dd>{{ application!.email }}</dd>
                <dt>Phone</dt><dd>{{ application!.phoneNumber }}</dd>
                <dt>Tax code</dt><dd>{{ application!.taxCode || '—' }}</dd>
                <dt>Business address</dt><dd>{{ application!.businessAddress || '—' }}</dd>
                <dt>Description</dt><dd>{{ application!.description || '—' }}</dd>
                <dt>Submitted</dt><dd>{{ application!.createdOnUtc | date:'medium' }}</dd>
              </dl>
              @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
              @if (confirmCancel) {
                <div class="confirm confirm-danger" role="alertdialog" aria-label="Confirm cancel">
                  <span>Cancel this application?</span>
                  <div class="actions">
                    <button type="button" class="btn btn-danger" (click)="cancel()" [disabled]="busy">Yes, cancel application</button>
                    <button type="button" class="btn btn-secondary" (click)="confirmCancel = false">Keep it</button>
                  </div>
                </div>
              } @else {
                <div class="actions">
                  <button type="button" class="btn" (click)="startEdit()">Edit</button>
                  <button type="button" class="btn btn-danger" (click)="confirmCancel = true">Cancel application</button>
                </div>
              }
            </div>
          }
        }
        @case ('rejected') {
          <div class="panel-header"><h2>Application not approved</h2><span class="badge badge-rejected">Rejected</span></div>
          <div class="panel-body">
            <p class="banner" role="status"><strong>Reason:</strong> {{ application!.rejectReason }}</p>
            <div class="actions"><button type="button" class="btn" (click)="startReapply()">Apply again</button></div>
          </div>
        }
      }

      @if (showForm) {
        <div class="panel-header"><h2>{{ editing ? 'Edit application' : 'Shop application' }}</h2></div>
        <form class="form panel-body" (ngSubmit)="submit()" novalidate>
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
          <label>Shop name *
            <input type="text" name="shopName" [(ngModel)]="form.shopName" maxlength="400" required />
            @if (fieldError('shopName')) { <span class="field-error">{{ fieldError('shopName') }}</span> }
          </label>
          <div class="form-row">
            <label>Contact email *
              <input type="email" name="email" [(ngModel)]="form.email" maxlength="320" required />
              @if (fieldError('email')) { <span class="field-error">{{ fieldError('email') }}</span> }
            </label>
            <label>Phone number *
              <input type="tel" name="phoneNumber" [(ngModel)]="form.phoneNumber" maxlength="50" required />
              @if (fieldError('phoneNumber')) { <span class="field-error">{{ fieldError('phoneNumber') }}</span> }
            </label>
          </div>
          <label>Description
            <textarea name="description" rows="3" [(ngModel)]="form.description"></textarea>
          </label>
          <div class="form-row">
            <label>Tax code
              <input type="text" name="taxCode" [(ngModel)]="form.taxCode" maxlength="50" />
              @if (fieldError('taxCode')) { <span class="field-error">{{ fieldError('taxCode') }}</span> }
            </label>
            <label>Business address
              <input type="text" name="businessAddress" [(ngModel)]="form.businessAddress" maxlength="1000" />
              @if (fieldError('businessAddress')) { <span class="field-error">{{ fieldError('businessAddress') }}</span> }
            </label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy || !canSubmit()">{{ busy ? 'Saving…' : (editing ? 'Save changes' : 'Submit application') }}</button>
            @if (editing) { <button type="button" class="btn btn-secondary" (click)="editing = false">Cancel</button> }
          </div>
        </form>
      }
    </div>
  `
})
export class BecomeVendorPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);

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
      error: () => this.fail('Unable to load your account.')
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
      error: err => this.fail(vendorErrorMessage(err, 'Unable to load your application.'))
    });
  }

  resendVerification() {
    const email = this.auth.session()?.email;
    if (!email) return;
    this.busy = true;
    this.auth.sendEmailVerification(email).subscribe({
      next: () => { this.busy = false; this.verificationMessage = 'If the email is not yet verified, a new link is on its way.'; },
      error: () => { this.busy = false; this.verificationMessage = ''; this.actionError = 'Unable to send the email. Try again later.'; }
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
        this.actionError = Object.keys(this.fieldErrors).length ? '' : vendorErrorMessage(err, 'Unable to save the application.');
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
        this.actionError = vendorErrorMessage(err, 'Unable to cancel the application.');
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
