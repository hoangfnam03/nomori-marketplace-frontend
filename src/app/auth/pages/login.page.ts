import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t">
      <section><div class="eyebrow">{{ t('auth.login.eyebrow') }}</div><h1>{{ t('auth.login.title') }}</h1><p class="lede">{{ t('auth.login.lede') }}</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2>{{ t('auth.login.heading') }}</h2>
        <div class="field"><label for="email">{{ t('auth.fields.email') }}</label><input id="email" type="email" formControlName="email" autocomplete="email" /> @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">{{ t('auth.validation.emailInvalid') }}</span> }</div>
        <div class="field"><label for="password">{{ t('auth.fields.password') }}</label><input id="password" type="password" formControlName="password" autocomplete="current-password" /> @if (form.controls.password.touched && form.controls.password.invalid) { <span class="field-error">{{ t('auth.validation.passwordRequired') }}</span> }</div>
        <label class="remember"><input type="checkbox" formControlName="rememberMe" /> {{ t('auth.login.rememberMe') }}</label>
        @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? t('auth.login.submitting') : t('auth.login.submit') }}</button>
        <div class="auth-links"><a routerLink="/auth/register">{{ t('auth.links.createAccount') }}</a><a routerLink="/auth/forgot-password">{{ t('auth.links.forgotPassword') }}</a></div>
      </form>
    </div>
  `
})
export class LoginPage {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required], rememberMe: [false] });
  error: string | null = null;

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error = null;
    const request = this.form.getRawValue();
    this.auth.login(request).subscribe({
      next: result => result?.otpRequired
        ? this.router.navigate(['/auth/login-otp'], { queryParams: { challengeId: result.challengeId, rememberMe: request.rememberMe, developmentCode: result.developmentCode ?? undefined } })
        : this.router.navigateByUrl('/storefront'),
      error: error => this.error = error.message
    });
  }
}
