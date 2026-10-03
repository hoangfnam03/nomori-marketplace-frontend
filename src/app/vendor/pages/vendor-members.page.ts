import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorMemberResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="members-title">
      <div class="eyebrow">{{ t('vendor.members.eyebrow') }}</div>
      <h1 id="members-title">{{ t('vendor.members.title') }}</h1>
      <p>{{ t('vendor.members.lede') }} <a routerLink="/vendor">{{ t('vendor.members.backToShop') }}</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">{{ t('vendor.portal.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header"><h2>{{ t('admin.vendors.members') }}</h2></div>
        @if (loading) {
          <p class="state">{{ t('admin.vendors.loadingMembers') }}</p>
        } @else if (loadError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>{{ t('admin.vendors.account') }}</th><th>{{ t('admin.common.status') }}</th><th>{{ t('admin.vendors.lastSignIn') }}</th><th></th></tr></thead>
              <tbody>
                @for (m of members; track m.customerId) {
                  <tr>
                    <td>
                      {{ m.email }} @if (m.isCurrentUser) { <span class="badge">{{ t('vendor.members.you') }}</span> }
                      @if (fullName(m)) { <br /><span class="muted">{{ fullName(m) }}</span> }
                    </td>
                    <td><span [class]="'badge badge-' + m.status">{{ m.status === 'active' ? t('vendorStatus.member.active') : t('vendorStatus.member.pendingSetup') }}</span></td>
                    <td>{{ m.lastLoginDateUtc ? (m.lastLoginDateUtc | date:'dd/MM/yyyy HH:mm') : '—' }}</td>
                    <td class="row-actions">
                      @if (pendingRemove?.customerId === m.customerId) {
                        <span class="muted">{{ m.isCurrentUser ? t('vendor.members.confirmLeave') : t('vendor.members.confirmRemove') }}</span>
                        <button type="button" class="btn btn-danger btn-small" (click)="remove(m)" [disabled]="busy">{{ m.isCurrentUser ? t('vendor.members.leaveShop') : t('admin.vendors.remove') }}</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingRemove = null">{{ t('common.actions.cancel') }}</button>
                      } @else {
                        @if (m.status === 'pendingSetup') {
                          <button type="button" class="btn btn-secondary btn-small" (click)="resend(m)" [disabled]="busy">{{ t('vendor.members.resend') }}</button>
                        }
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingRemove = m" [disabled]="members.length <= 1"
                          [title]="members.length <= 1 ? t('errors.vendor_member.last_member') : ''">{{ m.isCurrentUser ? t('vendor.members.leave') : t('admin.vendors.remove') }}</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (members.length <= 1) { <p class="state">{{ t('vendor.members.onlyMember') }}</p> }
          @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
          @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
        }
      </div>

      <div class="panel">
        <div class="panel-header"><h2>{{ t('vendor.members.addHeading') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="add()" novalidate>
          <p class="muted">{{ t('vendor.members.addHint') }}</p>
          @if (addError) { <p class="banner" role="alert">{{ addError }}</p> }
          <label>{{ t('admin.common.email') }} *
            <input type="email" name="email" [(ngModel)]="form.email" maxlength="320" required autocomplete="off" />
          </label>
          <div class="form-row">
            <label>{{ t('customer.fields.firstName') }} <input type="text" name="firstName" [(ngModel)]="form.firstName" maxlength="100" /></label>
            <label>{{ t('customer.fields.lastName') }} <input type="text" name="lastName" [(ngModel)]="form.lastName" maxlength="100" /></label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy || !form.email.trim()">{{ busy ? t('storefront.productDetail.adding') : t('vendor.members.add') }}</button>
          </div>
        </form>
      </div>
    }
    </ng-container>
  `
})
export class VendorMembersPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  vendorId: number | null = null;
  members: VendorMemberResponse[] = [];
  loading = true;
  loadError = '';
  busy = false;
  actionError = '';
  addError = '';
  notice = '';
  pendingRemove: VendorMemberResponse | null = null;
  form = { email: '', firstName: '', lastName: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.auth.refreshSession();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        if (!this.vendorId) { this.loading = false; return; }
        this.fetchMembers();
      },
      error: () => { this.loading = false; this.loadError = this.transloco.translate('vendor.portal.errors.loadAccount'); }
    });
  }

  add() {
    if (!this.vendorId || !this.form.email.trim()) return;
    this.busy = true;
    this.addError = '';
    this.notice = '';
    const email = this.form.email.trim();
    this.api.createMember(this.vendorId, {
      email,
      firstName: this.form.firstName.trim() || null,
      lastName: this.form.lastName.trim() || null
    }).subscribe({
      next: created => {
        this.busy = false;
        this.form = { email: '', firstName: '', lastName: '' };
        this.notice = this.transloco.translate('vendor.members.setupSent', { email: created.email })
          + (created.developmentSetupToken ? ' ' + this.transloco.translate('vendor.members.devToken', { token: created.developmentSetupToken }) : '');
        this.fetchMembers();
      },
      error: err => { this.busy = false; this.addError = vendorErrorMessage(err, this.transloco.translate('vendor.members.errors.add')); }
    });
  }

  resend(m: VendorMemberResponse) {
    if (!this.vendorId) return;
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.resendSetupEmail(this.vendorId, m.customerId).subscribe({
      next: res => {
        this.busy = false;
        this.notice = this.transloco.translate('vendor.members.setupResent', { email: m.email })
          + (res.developmentSetupToken ? ' ' + this.transloco.translate('vendor.members.devToken', { token: res.developmentSetupToken }) : '');
        this.fetchMembers();
      },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('vendor.members.errors.resend'));
        if (err?.status === 409) this.fetchMembers();
      }
    });
  }

  remove(m: VendorMemberResponse) {
    if (!this.vendorId) return;
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.removeMember(this.vendorId, m.customerId).subscribe({
      next: () => {
        this.busy = false;
        this.pendingRemove = null;
        if (m.isCurrentUser) {
          // Seller access is gone: reload the session and leave the portal.
          this.auth.refreshSession();
          this.router.navigateByUrl('/storefront');
        } else {
          this.fetchMembers();
        }
      },
      error: err => {
        this.busy = false;
        this.pendingRemove = null;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.vendors.errors.removeMember'));
        this.fetchMembers();
      }
    });
  }

  fullName(m: VendorMemberResponse) {
    return [m.firstName, m.lastName].filter(Boolean).join(' ');
  }

  private fetchMembers() {
    if (!this.vendorId) return;
    this.api.getMembers(this.vendorId).subscribe({
      next: members => { this.members = members; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.vendors.errors.loadMembers')); }
    });
  }
}
