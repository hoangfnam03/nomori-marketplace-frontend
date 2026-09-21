import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { passwordValidators } from '../../core/auth/password-policy';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page"><section><div class="eyebrow">Account / Reset</div><h1>Start with a clean key.</h1><p class="lede">Use the one-time link from your email to create a new password.</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>Reset password</h2>
        <div class="field"><label for="token">Recovery token</label><input id="token" type="text" formControlName="token" autocomplete="off" /></div>
        <div class="field"><label for="newPassword">New password</label><input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" /> @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) { <span class="field-error">Use at least 12 characters with upper/lowercase, a number and a special character.</span> }</div>
        @if (error) { <div class="form-error" role="alert">{{ error }}</div> } @if (success) { <div class="form-success" role="status">Password reset. You can sign in with the new password.</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Resetting...' : 'Reset password' }}</button><div class="auth-links"><a routerLink="/auth/login">Back to sign in</a></div>
      </form>
    </div>
  `
})
export class ResetPasswordPage {
  readonly auth = inject(AuthFacade); private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ token: [this.route.snapshot.queryParamMap.get('token') ?? '', Validators.required], newPassword: ['', passwordValidators] }); error: string | null = null; success = false;
  submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.auth.resetPassword(this.form.getRawValue()).subscribe({ next: () => { this.success = true; setTimeout(() => this.router.navigateByUrl('/auth/login'), 900); }, error: error => this.error = error.message }); }
}
