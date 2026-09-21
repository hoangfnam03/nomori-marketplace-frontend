import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import { AuthSession, CsrfResponse, LoginResponse, OtpChallengeResponse, PasswordPolicy, PermissionsResponse, RecoveryResponse, RegistrationResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getCsrfToken() {
    return this.http.get<CsrfResponse>(`${this.apiBaseUrl}/v1/auth/csrf`);
  }

  getSession() {
    return this.http.get<AuthSession>(`${this.apiBaseUrl}/v1/auth/session`);
  }

  register(request: { email: string; password: string }) {
    return this.http.post<RegistrationResponse>(`${this.apiBaseUrl}/v1/auth/register`, request);
  }

  login(request: { email: string; password: string; rememberMe: boolean }) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/v1/auth/login`, request);
  }

  logout() {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/logout`, {});
  }

  getPermissions() {
    return this.http.get<PermissionsResponse>(`${this.apiBaseUrl}/v1/auth/permissions`);
  }

  getPasswordPolicy() {
    return this.http.get<PasswordPolicy>(`${this.apiBaseUrl}/v1/auth/password/policy`);
  }

  changePassword(request: { currentPassword: string; newPassword: string }) {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/password/change`, request);
  }

  forgotPassword(request: { email: string }) {
    return this.http.post<RecoveryResponse>(`${this.apiBaseUrl}/v1/auth/password/forgot`, request);
  }

  resetPassword(request: { token: string; newPassword: string }) {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/password/reset`, request);
  }

  sendEmailVerification(request: { email: string }) {
    return this.http.post<{ message: string; token?: string }>(`${this.apiBaseUrl}/v1/auth/email/verification/send`, request);
  }

  verifyEmail(token: string) {
    return this.http.get<void>(`${this.apiBaseUrl}/v1/auth/email/verify`, { params: { token } });
  }

  verifyLoginOtp(request: { challengeId: string; code: string; rememberMe: boolean }) {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/login/otp/verify`, request);
  }

  setupOtp() {
    return this.http.post<OtpChallengeResponse>(`${this.apiBaseUrl}/v1/auth/otp/setup`, {});
  }

  enableOtp(request: { challengeId: string; code: string }) {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/otp/enable`, request);
  }

  disableOtp() {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/auth/otp/disable`, {});
  }
}
