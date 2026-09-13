import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page"><section><div class="eyebrow">Account / Recovery</div><h1>A way back in.</h1><p class="lede">Request recovery instructions. In Development, the API returns a token so the flow can be tested locally.</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>Forgot password</h2>
        <div class="field"><label for="email">Email</label><input id="email" type="email" formControlName="email" autocomplete="email" /></div>
        @if (error) { <div class="form-error" role="alert">{{ error }}</div> } @if (message) { <div class="form-success" role="status">{{ message }}@if (token) { <br /><br /><strong>Development token:</strong> {{ token }} }</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Requesting...' : 'Request recovery' }}</button><div class="auth-links"><a routerLink="/auth/login">Back to sign in</a><a routerLink="/auth/reset-password">I have a reset token</a></div>
      </form>
    </div>
  `
})
export class ForgotPasswordPage {
  readonly auth = inject(AuthFacade);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({ email: ['', [Validators.required, Validators.email]] });
  error: string | null = null; message: string | null = null; token?: string;
  submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.auth.forgotPassword(this.form.getRawValue().email).subscribe({ next: result => { this.message = result.message; this.token = result.token; }, error: error => this.error = error.message }); }
}
