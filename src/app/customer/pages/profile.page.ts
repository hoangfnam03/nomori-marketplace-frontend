import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { CustomerProfileApiService } from '../../core/customer/customer-profile-api.service';
import { MediaImageFieldComponent } from '../../shared/components/media-image-field/media-image-field.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective, MediaImageFieldComponent],
  styleUrls: ['../../auth/auth-page.scss'],
  template: `
    <div class="account-page" *transloco="let t">
      <div class="eyebrow">{{ t('customer.profile.eyebrow') }}</div>
      <h1>{{ t('customer.profile.title') }}</h1>
      <div class="profile-grid">
        <section class="auth-panel profile-summary">
          <h2>{{ t('customer.profile.identityHeading') }}</h2>
          <dl class="session-data">
            <div><dt>{{ t('customer.fields.email') }}</dt><dd>{{ profile?.email ?? t('common.states.loading') }}</dd></div>
            <div><dt>{{ t('customer.profile.verification') }}</dt><dd>{{ profile?.emailVerified ? t('customer.profile.verified') : t('customer.profile.notVerified') }}</dd></div>
            <div><dt>{{ t('customer.profile.username') }}</dt><dd>{{ profile?.username ?? t('customer.profile.notSet') }}</dd></div>
          </dl>
          <p class="profile-note">{{ t('customer.profile.settingsNote') }}</p>
          <div class="auth-links"><a routerLink="/customer/settings">{{ t('customer.links.settings') }}</a></div>
        </section>
        <form class="auth-panel" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <h2>{{ t('customer.profile.detailsHeading') }}</h2>
          <div class="field">
            <app-media-image-field [label]="t('customer.profile.avatar')" purpose="customerAvatar" [(pictureId)]="avatarPictureId" />
            <span class="avatar-hint">{{ t('customer.profile.avatarHint') }}</span>
            @if (fieldError('avatarPictureId')) { <span class="field-error">{{ fieldError('avatarPictureId') }}</span> }
          </div>
          <div class="field"><label for="firstName">{{ t('customer.fields.firstName') }}</label><input id="firstName" type="text" formControlName="firstName" autocomplete="given-name" maxlength="100" /> @if (fieldError('firstName')) { <span class="field-error">{{ fieldError('firstName') }}</span> }</div>
          <div class="field"><label for="lastName">{{ t('customer.fields.lastName') }}</label><input id="lastName" type="text" formControlName="lastName" autocomplete="family-name" maxlength="100" /> @if (fieldError('lastName')) { <span class="field-error">{{ fieldError('lastName') }}</span> }</div>
          <div class="field"><label for="gender">{{ t('customer.fields.gender') }}</label><select id="gender" formControlName="gender"><option value="">{{ t('customer.gender.none') }}</option><option value="male">{{ t('customer.gender.male') }}</option><option value="female">{{ t('customer.gender.female') }}</option><option value="other">{{ t('customer.gender.other') }}</option><option value="unspecified">{{ t('customer.gender.unspecified') }}</option></select></div>
          <div class="field"><label for="dateOfBirth">{{ t('customer.fields.dateOfBirth') }}</label><input id="dateOfBirth" type="date" formControlName="dateOfBirth" /></div>
          <div class="field"><label for="phone">{{ t('customer.fields.phone') }}</label><input id="phone" type="tel" formControlName="phone" autocomplete="tel" maxlength="32" /> @if (fieldError('phone')) { <span class="field-error">{{ fieldError('phone') }}</span> }</div>
          @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> }
          @if (success) { <div class="form-success" role="status">{{ t('customer.profile.updated') }}</div> }
          <button class="submit" type="submit" [disabled]="loading || saving">{{ saving ? t('common.states.saving') : t('customer.profile.save') }}</button>
          <div class="auth-links"><a routerLink="/auth/account">{{ t('customer.links.backToAccount') }}</a></div>
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
    .avatar-hint { color: var(--muted); font-size: .76rem; }
    select { width: 100%; padding: .8rem; border: 1px solid var(--line-strong); background: var(--paper); font: inherit; }
    @media (max-width: 760px) { .profile-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfilePage {
  private readonly api = inject(CustomerProfileApiService);
  private readonly auth = inject(AuthFacade);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    gender: [''],
    dateOfBirth: [''],
    phone: ['', Validators.maxLength(32)]
  });
  profile?: import('../../core/customer/customer-profile.models').CustomerProfile;
  /** Kept outside the reactive form because the image field binds it two ways; saved together with the form. */
  avatarPictureId = 0;
  loading = true;
  saving = false;
  success = false;
  error: string | null = null;
  fieldErrors: Record<string, string[]> = {};

  constructor() {
    this.api.getProfile().subscribe({
      next: profile => { this.profile = profile; this.avatarPictureId = profile.avatarPictureId ?? 0; this.form.patchValue({ firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', gender: profile.gender ?? '', dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? '', phone: profile.phone ?? '' }); this.loading = false; },
      error: error => { this.error = error.status === 403 ? 'customer.profile.errors.forbidden' : 'customer.profile.errors.load'; this.loading = false; }
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.success = false; this.error = null; this.fieldErrors = {};
    const value = this.form.getRawValue();
    this.api.updateProfile({ ...value, gender: value.gender || null, dateOfBirth: value.dateOfBirth || null, firstName: value.firstName || null, lastName: value.lastName || null, phone: value.phone || null, avatarPictureId: this.avatarPictureId }).subscribe({
      // The header greets the user by name, so it needs the new one.
      next: profile => { this.profile = profile; this.success = true; this.saving = false; this.auth.refreshSession(); },
      error: error => { this.error = error.status === 400 ? 'errors.badRequest' : 'customer.profile.errors.save'; this.fieldErrors = error.fieldErrors ?? {}; this.saving = false; }
    });
  }

  fieldError(field: string) { return this.fieldErrors[field]?.[0] ?? null; }
}
