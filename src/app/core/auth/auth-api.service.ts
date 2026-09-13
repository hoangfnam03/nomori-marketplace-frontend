import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import { AuthSession, CsrfResponse } from './auth.models';

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
}
