import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { passwordValidators } from '../../core/auth/password-policy';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t"><section><div class="eyebrow">{{ t('auth.reset.eyebrow') }}</div><h1>{{ t('auth.reset.title') }}</h1><p class="lede">{{ t('auth.reset.lede') }}</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>{{ t('auth.reset.heading') }}</h2>
        <div class="field"><label for="token">{{ t('auth.fields.recoveryToken') }}</label><input id="token" type="text" formControlName="token" autocomplete="off" /></div>
        <div class="field"><label for="newPassword">{{ t('auth.fields.newPassword') }}</label><input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" /> @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) { <span class="field-error">{{ t('auth.validation.passwordPolicy') }}</span> }</div>
        @if (error) { <div class="form-error" role="alert">{{ t(error) }}</div> } @if (success) { <div class="form-success" role="status">{{ t('auth.reset.success') }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? t('auth.reset.submitting') : t('auth.reset.submit') }}</button><div class="auth-links"><a routerLink="/auth/login">{{ t('auth.links.backToSignIn') }}</a></div>
      </form>
    </div>
  `
})
export class ResetPasswordPage {
  readonly auth = inject(AuthFacade); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ token: [this.route.snapshot.queryParamMap.get('token') ?? '', Validators.required], newPassword: ['', passwordValidators] }); error: string | null = null; success = false;
  submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.auth.resetPassword(this.form.getRawValue()).subscribe({ next: () => { this.success = true; setTimeout(() => this.router.navigateByUrl('/auth/login'), 900); }, error: error => this.error = error.message }); }
}
