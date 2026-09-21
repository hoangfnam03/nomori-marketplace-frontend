import { Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import { passwordValidators } from '../../core/auth/password-policy';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page">
      <section><div class="eyebrow">Account / Join</div><h1>Make room for things worth finding.</h1><p class="lede">Create a Nomori Marketplace account to keep your details, orders and saved objects together.</p></section>
      <form class="auth-panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2>Create account</h2>
        <div class="field"><label for="email">Email</label><input id="email" type="email" formControlName="email" autocomplete="email" /> @if (form.controls.email.touched && form.controls.email.invalid) { <span class="field-error">Enter a valid email address.</span> }</div>
        <div class="field"><label for="password">Password</label><input id="password" type="password" formControlName="password" autocomplete="new-password" /> @if (form.controls.password.touched && form.controls.password.invalid) { <span class="field-error">Use at least 12 characters with upper/lowercase, a number and a special character.</span> }</div>
        <div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" /> @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.invalid) { <span class="field-error">Passwords must match.</span> }</div>
        @if (error) { <div class="form-error" role="alert">{{ error }}</div> }
        @if (success) { <div class="form-success" role="status">Account created. Check your email and open the verification link before signing in.</div> }
        <button class="submit" type="submit" [disabled]="form.invalid || auth.isLoading()">{{ auth.isLoading() ? 'Creating...' : 'Create account' }}</button>
        <div class="auth-links"><a routerLink="/auth/login">Already have an account?</a></div>
      </form>
    </div>
  `
})
export class RegisterPage {
  readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', passwordValidators],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });
  error: string | null = null;
  success = false;

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error = null;
    const { email, password } = this.form.getRawValue();
    this.auth.register({ email, password }).subscribe({ next: result => this.registrationCompleted(result.verificationToken), error: error => this.error = error.message });
  }

  private registrationCompleted(verificationToken?: string | null) {
    if (verificationToken) {
      this.router.navigate(['/auth/verify-email'], { queryParams: { token: verificationToken } });
      return;
    }
    this.success = true;
  }
}
