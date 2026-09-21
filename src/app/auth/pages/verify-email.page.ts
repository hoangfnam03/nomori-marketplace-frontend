import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page"><section><div class="eyebrow">Account / Email</div><h1>Confirm your address.</h1><p class="lede">Email verification keeps account recovery and email OTP secure.</p></section>
      <section class="auth-panel">
        @if (loading) { <h2>Verifying...</h2> }
        @if (success) { <h2>Email verified</h2><p class="form-success">Your email address is ready to use.</p> }
        @if (error) { <h2>Verification failed</h2><div class="form-error" role="alert">{{ error }}</div> }
        <div class="auth-links"><a routerLink="/auth/login">Continue to sign in</a></div>
      </section>
    </div>
  `
})
export class VerifyEmailPage {
  readonly auth = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  loading = true;
  success = false;
  error: string | null = null;

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.loading = false; this.error = 'Missing verification token.'; return; }
    this.auth.verifyEmail(token).subscribe({ next: () => { this.loading = false; this.success = true; }, error: error => { this.loading = false; this.error = error.message; } });
  }
}
