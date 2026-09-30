import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorMemberResponse } from '../../core/vendors/vendor.models';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="members-title">
      <div class="eyebrow">Vendor portal / Members</div>
      <h1 id="members-title">Shop members.</h1>
      <p>Everyone on this list has the same access. <a routerLink="/vendor">Back to shop</a></p>
    </section>

    @if (!vendorId && !loading) {
      <div class="panel"><p class="state">Your account does not belong to a shop.</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header"><h2>Members</h2></div>
        @if (loading) {
          <p class="state">Loading members…</p>
        } @else if (loadError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ loadError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>Account</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
              <tbody>
                @for (m of members; track m.customerId) {
                  <tr>
                    <td>
                      {{ m.email }} @if (m.isCurrentUser) { <span class="badge">You</span> }
                      @if (fullName(m)) { <br /><span class="muted">{{ fullName(m) }}</span> }
                    </td>
                    <td><span [class]="'badge badge-' + m.status">{{ m.status === 'active' ? 'Active' : 'Pending setup' }}</span></td>
                    <td>{{ m.lastLoginDateUtc ? (m.lastLoginDateUtc | date:'medium') : '—' }}</td>
                    <td class="row-actions">
                      @if (pendingRemove?.customerId === m.customerId) {
                        <span class="muted">{{ m.isCurrentUser ? 'Leave this shop?' : 'Remove this member?' }}</span>
                        <button type="button" class="btn btn-danger btn-small" (click)="remove(m)" [disabled]="busy">{{ m.isCurrentUser ? 'Leave shop' : 'Remove' }}</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingRemove = null">Cancel</button>
                      } @else {
                        @if (m.status === 'pendingSetup') {
                          <button type="button" class="btn btn-secondary btn-small" (click)="resend(m)" [disabled]="busy">Resend email</button>
                        }
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingRemove = m" [disabled]="members.length <= 1"
                          [title]="members.length <= 1 ? 'A shop must keep at least one member' : ''">{{ m.isCurrentUser ? 'Leave' : 'Remove' }}</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (members.length <= 1) { <p class="state">You are the only member, so you cannot leave the shop.</p> }
          @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
          @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
        }
      </div>

      <div class="panel">
        <div class="panel-header"><h2>Add account</h2></div>
        <form class="form panel-body" (ngSubmit)="add()" novalidate>
          <p class="muted">The new member gets an email with a link to set their own password. You never see or choose it.</p>
          @if (addError) { <p class="banner" role="alert">{{ addError }}</p> }
          <label>Email *
            <input type="email" name="email" [(ngModel)]="form.email" maxlength="320" required autocomplete="off" />
          </label>
          <div class="form-row">
            <label>First name <input type="text" name="firstName" [(ngModel)]="form.firstName" maxlength="100" /></label>
            <label>Last name <input type="text" name="lastName" [(ngModel)]="form.lastName" maxlength="100" /></label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy || !form.email.trim()">{{ busy ? 'Adding…' : 'Add account' }}</button>
          </div>
        </form>
      </div>
    }
  `
})
export class VendorMembersPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

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
      error: () => { this.loading = false; this.loadError = 'Unable to load your account.'; }
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
        this.notice = `A set-password email was sent to ${created.email}.`
          + (created.developmentSetupToken ? ` Development setup token: ${created.developmentSetupToken}` : '');
        this.fetchMembers();
      },
      error: err => { this.busy = false; this.addError = vendorErrorMessage(err, 'Unable to add the account.'); }
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
        this.notice = `A new set-password email was sent to ${m.email}.`
          + (res.developmentSetupToken ? ` Development setup token: ${res.developmentSetupToken}` : '');
        this.fetchMembers();
      },
      error: err => {
        this.busy = false;
        this.actionError = vendorErrorMessage(err, 'Unable to resend the email.');
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
        this.actionError = vendorErrorMessage(err, 'Unable to remove the member.');
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
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load members.'); }
    });
  }
}
