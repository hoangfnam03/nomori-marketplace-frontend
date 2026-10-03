import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t"><section><div class="eyebrow">{{ t('auth.forgot.eyebrow') }}</div><h1>{{ t('auth.forgot.title') }}</h1><p class="lede">{{ t('auth.forgot.lede') }}</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>{{ t('auth.forgot.heading') }}</h2>
        <div class="field"><label for="email">{{ t('auth.fields.email') }}</label><input id="email" type="email" formControlName="email" autocomplete="email" /></div>
        @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> } @if (sent) { <div class="form-success" role="status">{{ t('auth.forgot.sent') }}@if (token) { <br /><br /><strong>{{ t('auth.dev.tokenLabel') }}</strong> {{ token }} }</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? t('auth.forgot.submitting') : t('auth.forgot.submit') }}</button><div class="auth-links"><a routerLink="/auth/login">{{ t('auth.links.backToSignIn') }}</a><a routerLink="/auth/reset-password">{{ t('auth.links.haveResetToken') }}</a></div>
      </form>
    </div>
  `
})
export class ForgotPasswordPage {
  readonly auth = inject(AuthFacade);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ email: ['', [Validators.required, Validators.email]] });
  error: string | null = null; sent = false; token?: string;
  submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.error = null; this.auth.forgotPassword(this.form.getRawValue().email).subscribe({ next: result => { this.sent = true; this.token = result.token; }, error: error => this.error = error.message }); }
}
