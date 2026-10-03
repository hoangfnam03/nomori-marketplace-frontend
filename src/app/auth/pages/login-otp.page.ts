import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t"><section><div class="eyebrow">{{ t('auth.otp.eyebrow') }}</div><h1>{{ t('auth.otp.title') }}</h1><p class="lede">{{ t('auth.otp.lede') }}</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>{{ t('auth.otp.heading') }}</h2>
        <div class="field"><label for="code">{{ t('auth.fields.verificationCode') }}</label><input id="code" type="text" inputmode="numeric" maxlength="6" formControlName="code" autocomplete="one-time-code" /></div>
        @if (developmentCode) { <div class="form-success" role="status">{{ t('auth.dev.code', { code: developmentCode }) }}</div> }
        @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? t('auth.otp.submitting') : t('auth.otp.submit') }}</button>
        <div class="auth-links"><a routerLink="/auth/login">{{ t('auth.links.backToSignIn') }}</a></div>
      </form>
    </div>
  `
})
export class LoginOtpPage {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  readonly challengeId = this.route.snapshot.queryParamMap.get('challengeId') ?? '';
  readonly rememberMe = this.route.snapshot.queryParamMap.get('rememberMe') === 'true';
  readonly developmentCode = this.route.snapshot.queryParamMap.get('developmentCode');
  error: string | null = null;

  submit() {
    if (this.form.invalid || !this.challengeId) { this.form.markAllAsTouched(); return; }
    this.auth.verifyLoginOtp({ challengeId: this.challengeId, code: this.form.getRawValue().code, rememberMe: this.rememberMe })
      .subscribe({ next: () => this.router.navigateByUrl('/storefront'), error: error => this.error = error.message });
  }
}
