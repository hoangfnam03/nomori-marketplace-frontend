import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page">
      <section><div class="eyebrow">Account / Sign in</div><h1>Welcome back to your marketplace.</h1><p class="lede">Your session is secured by the Nomori Marketplace cookie boundary. The form will obtain CSRF protection automatically.</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2>Sign in</h2>
        <div class="field"><label for="email">Email</label><input id="email" type="email" formControlName="email" autocomplete="email" /> @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }</div>
        <div class="field"><label for="password">Password</label><input id="password" type="password" formControlName="password" autocomplete="current-password" /> @if (form.controls.password.touched && form.controls.password.invalid) { <span class="field-error">Password is required.</span> }</div>
        <label class="remember"><input type="checkbox" formControlName="rememberMe" /> Keep me signed in</label>
        @if (error) { <div class="form-error" role="alert">{{ error }}</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Signing in...' : 'Sign in' }}</button>
        <div class="auth-links"><a routerLink="/auth/register">Create an account</a><a routerLink="/auth/forgot-password">Forgot password?</a></div>
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
    this.auth.login(this.form.getRawValue()).subscribe({ next: () => this.router.navigateByUrl('/storefront'), error: error => this.error = error.message });
  }
}
