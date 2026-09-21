import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { passwordValidators } from '../../core/auth/password-policy';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="account-page">
      <div class="eyebrow">Account / Session</div>
      <h1>Your account boundary.</h1>
      <div class="account-grid">
        <section class="auth-panel">
          <h2>Session</h2>
          <dl class="session-data"><div><dt>Status</dt><dd>{{ auth.isAuthenticated() ? 'Authenticated' : 'Guest' }}</dd></div><div><dt>Email</dt><dd>{{ auth.session()?.email ?? 'Not signed in' }}</dd></div><div><dt>Customer ID</dt><dd>{{ auth.session()?.customerId ?? '—' }}</dd></div></dl>
          <button class="submit" type="button" (click)="loadPermissions()" [disabled]="permissionsLoading">Load permissions</button>
          @if (permissionsError) { <div class="form-error" role="alert">{{ permissionsError }}</div> }
          @if (permissions) { <div class="permissions"><strong>Permissions</strong><span>{{ permissions.length ? permissions.join(', ') : 'No permissions assigned' }}</span></div> }
          <div class="security-block"><strong>Email security</strong>
            @if (auth.session()?.emailVerified) { <span class="form-success">Email verified</span> }
            @else { <span class="form-error">Email not verified</span><button type="button" class="submit secondary" (click)="sendVerification()" [disabled]="verificationLoading">{{ verificationLoading ? 'Sending...' : 'Send verification email' }}</button> }
            @if (verificationToken) { <div class="form-success">Development token: {{ verificationToken }}</div> }
          </div>
          <div class="security-block"><strong>Email OTP</strong>
            @if (auth.session()?.emailOtpEnabled) { <span class="form-success">Enabled</span><button type="button" class="submit secondary" (click)="disableOtp()">Disable email OTP</button> }
            @else { <button type="button" class="submit secondary" (click)="setupOtp()" [disabled]="otpLoading || !auth.session()?.emailVerified">{{ otpLoading ? 'Sending...' : 'Start OTP setup' }}</button> }
            @if (otpChallengeId) { <div class="field"><label for="otpCode">OTP code</label><input id="otpCode" type="text" inputmode="numeric" maxlength="6" [formControl]="otpCode" /></div><button type="button" class="submit" (click)="enableOtp()" [disabled]="otpCode.invalid || otpLoading">Confirm OTP</button> }
            @if (developmentCode) { <div class="form-success">Development code: {{ developmentCode }}</div> }
            @if (securityError) { <div class="form-error" role="alert">{{ securityError }}</div> }
          </div>
        </section>
        <form class="auth-panel" [formGroup]="form" (ngSubmit)="changePassword()" novalidate>
          <h2>Change password</h2>
          <div class="field"><label for="currentPassword">Current password</label><input id="currentPassword" type="password" formControlName="currentPassword" autocomplete="current-password" /></div>
          <div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" /> @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) { <span class="field-error">Use at least 12 characters with upper/lowercase, a number and a special character.</span> }</div>
          @if (error) { <div class="form-error" role="alert">{{ error }}</div> } @if (success) { <div class="form-success" role="status">Password changed. Sign in again with the new password.</div> }
          <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Changing...' : 'Change password' }}</button>
          <div class="auth-links"><a routerLink="/storefront">Back to storefront</a></div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .account-page { max-width: 1050px; margin: 0 auto; padding: 2rem 0 5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 1rem 0 2.5rem; font: 700 clamp(3rem, 7vw, 6.5rem)/.94 var(--display-font); }
    .account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .session-data { display: grid; gap: .75rem; margin: 0; }
    .session-data div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--line); }
    dt { color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; }
    dd { margin: 0; font-weight: 700; text-align: right; }
    .permissions { display: grid; gap: .4rem; margin-top: 1rem; padding: .8rem; background: rgba(39,116,93,.08); color: var(--muted); font-size: .85rem; }
    .security-block { display: grid; gap: .55rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--line); }
    .secondary { background: transparent; color: var(--ink); border: 1px solid var(--line); }
    @media (max-width: 760px) { .account-grid { grid-template-columns: 1fr; } }
  `]
})
export class AccountPage {
  readonly auth = inject(AuthFacade);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ currentPassword: ['', Validators.required], newPassword: ['', passwordValidators] });
  permissions?: string[]; permissionsLoading = false; permissionsError: string | null = null; error: string | null = null; success = false;
  verificationLoading = false; verificationToken?: string; otpLoading = false; otpChallengeId = ''; developmentCode?: string; securityError: string | null = null;
  readonly otpCode = this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  loadPermissions() {
    this.permissionsLoading = true; this.permissionsError = null;
    this.auth.getPermissions().subscribe({ next: result => this.permissions = result.permissions, error: error => { this.permissionsError = error.message; this.permissionsLoading = false; }, complete: () => this.permissionsLoading = false });
  }

  changePassword() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error = null; this.success = false;
    this.auth.changePassword(this.form.getRawValue()).subscribe({ next: () => { this.success = true; this.form.reset(); }, error: error => this.error = error.message });
  }

  sendVerification() {
    const email = this.auth.session()?.email;
    if (!email) return;
    this.verificationLoading = true; this.securityError = null;
    this.auth.sendEmailVerification(email).subscribe({ next: result => this.verificationToken = result.token, error: error => this.securityError = error.message, complete: () => this.verificationLoading = false });
  }

  setupOtp() {
    this.otpLoading = true; this.securityError = null;
    this.auth.setupOtp().subscribe({ next: result => { this.otpChallengeId = result.challengeId; this.developmentCode = result.developmentCode ?? undefined; }, error: error => this.securityError = error.message, complete: () => this.otpLoading = false });
  }

  enableOtp() {
    if (this.otpCode.invalid || !this.otpChallengeId) return;
    this.otpLoading = true; this.securityError = null;
    this.auth.enableOtp({ challengeId: this.otpChallengeId, code: this.otpCode.value }).subscribe({ next: () => { this.otpChallengeId = ''; this.developmentCode = undefined; this.otpCode.reset(); }, error: error => this.securityError = error.message, complete: () => this.otpLoading = false });
  }

  disableOtp() {
    this.otpLoading = true; this.securityError = null;
    this.auth.disableOtp().subscribe({ error: error => this.securityError = error.message, complete: () => this.otpLoading = false });
  }
}
