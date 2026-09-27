import { Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { passwordValidators } from '../../core/auth/password-policy';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t">
      <section><div class="eyebrow">{{ t('auth.register.eyebrow') }}</div><h1>{{ t('auth.register.title') }}</h1><p class="lede">{{ t('auth.register.lede') }}</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2>{{ t('auth.register.heading') }}</h2>
        <div class="field"><label for="email">{{ t('auth.fields.email') }}</label><input id="email" type="email" formControlName="email" autocomplete="email" /> @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">{{ t('auth.validation.emailInvalid') }}</span> }</div>
        <div class="field"><label for="password">{{ t('auth.fields.password') }}</label><input id="password" type="password" formControlName="password" autocomplete="new-password" /> @if (form.controls.password.touched && form.controls.password.invalid) { <span class="field-error">{{ t('auth.validation.passwordPolicy') }}</span> }</div>
        <div class="field"><label for="confirmPassword">{{ t('auth.fields.confirmPassword') }}</label><input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" /> @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.invalid) { <span class="field-error">{{ t('auth.validation.passwordsMismatch') }}</span> }</div>
        @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> }
        @if (success) { <div class="form-success" role="status">{{ t('auth.register.success') }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? t('auth.register.submitting') : t('auth.register.submit') }}</button>
        <div class="auth-links"><a routerLink="/auth/login">{{ t('auth.links.alreadyHaveAccount') }}</a></div>
      </form>
    </div>
  `
})
export class RegisterPage {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', passwordValidators],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });
  error: string | null = null;
  success = false;

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error = null;
    const { email, password } = this.form.getRawValue();
    this.auth.register({ email, password }).subscribe({ next: result => this.registrationCompleted(result.verificationToken), error: error => this.error = error.message });
  }

  private registrationCompleted(verificationToken?: string | null) {
    if (verificationToken) {
      this.router.navigate(['/auth/verify-email'], { queryParams: { token: verificationToken } });
      return;
    }
    this.success = true;
  }
}
