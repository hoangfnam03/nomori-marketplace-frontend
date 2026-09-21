import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerProfileApiService } from '../../core/customer/customer-profile-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../../auth/auth-page.scss'],
  template: `
    <div class="account-page">
      <div class="eyebrow">Customer / Profile</div>
      <h1>Your profile.</h1>
      <div class="profile-grid">
        <section class="auth-panel profile-summary">
          <h2>Account identity</h2>
          <dl class="session-data">
            <div><dt>Email</dt><dd>{{ profile?.email ?? 'Loading...' }}</dd></div>
            <div><dt>Verification</dt><dd>{{ profile?.emailVerified ? 'Verified' : 'Not verified' }}</dd></div>
            <div><dt>Username</dt><dd>{{ profile?.username ?? 'Not set' }}</dd></div>
          </dl>
          <p class="profile-note">Manage saved addresses, preferences and a verified email change from Customer settings.</p>
          <div class="auth-links"><a routerLink="/customer/settings">Customer settings</a></div>
        </section>
        <form class="auth-panel" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <h2>Personal details</h2>
          <div class="field"><label for="firstName">First name</label><input id="firstName" type="text" formControlName="firstName" autocomplete="given-name" maxlength="100" /> @if (fieldError('firstName')) { <span class="field-error">{{ fieldError('firstName') }}</span> }</div>
          <div class="field"><label for="lastName">Last name</label><input id="lastName" type="text" formControlName="lastName" autocomplete="family-name" maxlength="100" /> @if (fieldError('lastName')) { <span class="field-error">{{ fieldError('lastName') }}</span> }</div>
          <div class="field"><label for="gender">Gender</label><select id="gender" formControlName="gender"><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="unspecified">Unspecified</option></select></div>
          <div class="field"><label for="dateOfBirth">Date of birth</label><input id="dateOfBirth" type="date" formControlName="dateOfBirth" /></div>
          <div class="field"><label for="phone">Phone</label><input id="phone" type="tel" formControlName="phone" autocomplete="tel" maxlength="32" /> @if (fieldError('phone')) { <span class="field-error">{{ fieldError('phone') }}</span> }</div>
          @if (error) { <div class="form-error" role="alert">{{ error }}</div> }
          @if (success) { <div class="form-success" role="status">Profile updated.</div> }
          <button class="submit" type="submit" [disabled]="loading || saving">{{ saving ? 'Saving...' : 'Save profile' }}</button>
          <div class="auth-links"><a routerLink="/auth/account">Back to account</a></div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .account-page { max-width: 1050px; margin: 0 auto; padding: 2rem 0 5rem; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 1rem 0 2.5rem; font: 700 clamp(3rem, 7vw, 6.5rem)/.94 var(--display-font); }
    .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .session-data { display: grid; gap: .75rem; margin: 0; }
    .session-data div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .75rem; border-bottom: 1px solid var(--line); }
    dt { color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; }
    dd { margin: 0; font-weight: 700; text-align: right; overflow-wrap: anywhere; }
    .profile-note { margin-top: 1.5rem; color: var(--muted); font-size: .85rem; line-height: 1.6; }
    select { width: 100%; padding: .8rem; border: 1px solid var(--line-strong); background: var(--paper); font: inherit; }
    @media (max-width: 760px) { .profile-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfilePage {
  private readonly api = inject(CustomerProfileApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    gender: [''],
    dateOfBirth: [''],
    phone: ['', Validators.maxLength(32)]
  });
  profile?: import('../../core/customer/customer-profile.models').CustomerProfile;
  loading = true;
  saving = false;
  success = false;
  error: string | null = null;
  fieldErrors: Record<string, string[]> = {};

  constructor() {
    this.api.getProfile().subscribe({
      next: profile => { this.profile = profile; this.form.patchValue({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', gender: profile.gender ?? '', dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? '', phone: profile.phone ?? '' }); this.loading = false; },
      error: error => { this.error = error.status === 403 ? 'You do not have permission to read your profile.' : 'Unable to load your profile.'; this.loading = false; }
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.success = false; this.error = null; this.fieldErrors = {};
    const value = this.form.getRawValue();
    this.api.updateProfile({ ...value, gender: value.gender || null, dateOfBirth: value.dateOfBirth || null, firstName: value.firstName || null, lastName: value.lastName || null, phone: value.phone || null }).subscribe({
      next: profile => { this.profile = profile; this.success = true; this.saving = false; },
      error: error => { this.error = error.status === 400 ? 'Please correct the highlighted fields.' : 'Unable to update your profile.'; this.fieldErrors = error.fieldErrors ?? {}; this.saving = false; }
    });
  }

  fieldError(field: string) { return this.fieldErrors[field]?.[0] ?? null; }
}
