import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page"><section><div class="eyebrow">Account / Verification</div><h1>Check your inbox.</h1><p class="lede">Nomori sent a six-digit verification code to your email address.</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate><h2>Email OTP</h2>
        <div class="field"><label for="code">Verification code</label><input id="code" type="text" inputmode="numeric" maxlength="6" formControlName="code" autocomplete="one-time-code" /></div>
        @if (developmentCode) { <div class="form-success" role="status">Development code: {{ developmentCode }}</div> }
        @if (error) { <div class="form-error" role="alert">{{ error }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Verifying...' : 'Verify and sign in' }}</button>
        <div class="auth-links"><a routerLink="/auth/login">Back to sign in</a></div>
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
