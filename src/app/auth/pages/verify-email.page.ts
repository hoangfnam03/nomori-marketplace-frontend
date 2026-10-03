import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t"><section><div class="eyebrow">{{ t('auth.verify.eyebrow') }}</div><h1>{{ t('auth.verify.title') }}</h1><p class="lede">{{ t('auth.verify.lede') }}</p></section>
      <section class="auth-panel">
        @if (loading) { <h2>{{ t('auth.verify.verifying') }}</h2> }
        @if (success) { <h2>{{ t('auth.verify.successTitle') }}</h2><p class="form-success">{{ t('auth.verify.successText') }}</p> }
        @if (error) { <h2>{{ t('auth.verify.failedTitle') }}</h2><div class="form-error" role="alert">{{ t(error) }}</div> }
        <div class="auth-links"><a routerLink="/auth/login">{{ t('auth.links.continueToSignIn') }}</a></div>
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
    if (!token) { this.loading = false; this.error = 'auth.verify.missingToken'; return; }
    this.auth.verifyEmail(token).subscribe({ next: () => { this.loading = false; this.success = true; }, error: error => { this.loading = false; this.error = error.message; } });
  }
}
