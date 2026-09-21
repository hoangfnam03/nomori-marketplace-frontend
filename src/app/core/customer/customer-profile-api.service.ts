import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { CustomerProfile } from './customer-profile.models';

@Injectable({ providedIn: 'root' })
export class CustomerProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getProfile() {
    return this.http.get<CustomerProfile>(`${this.apiBaseUrl}/v1/customer/profile`);
  }

  updateProfile(request: {
    firstName: string | null;
    lastName: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    phone: string | null;
  }) {
    return this.http.put<CustomerProfile>(`${this.apiBaseUrl}/v1/customer/profile`, request);
  }
}
