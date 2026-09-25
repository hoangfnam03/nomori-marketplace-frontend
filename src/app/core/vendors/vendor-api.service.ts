import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import {
  VendorAdminPagedResponse, VendorAdminResponse,
  VendorPublicPagedResponse, VendorPublicResponse
} from './vendor.models';

export interface SaveVendorRequest {
  name: string;
  email: string;
  description?: string | null;
  adminComment?: string | null;
  active?: boolean;
  displayOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class VendorApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  // Public
  getVendors(page = 1, pageSize = 20, search?: string) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<VendorPublicPagedResponse>(`${this.apiBaseUrl}/v1/vendors`, { params });
  }

  getVendor(id: number) {
    return this.http.get<VendorPublicResponse>(`${this.apiBaseUrl}/v1/vendors/${id}`);
  }

  // Admin
  adminGetVendors(page = 1, pageSize = 50, search?: string, active?: boolean) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<VendorAdminPagedResponse>(`${this.apiBaseUrl}/v1/admin/vendors`, { params });
  }

  adminGetVendor(id: number) {
    return this.http.get<VendorAdminResponse>(`${this.apiBaseUrl}/v1/admin/vendors/${id}`);
  }

  adminCreateVendor(body: SaveVendorRequest) {
    return this.http.post<VendorAdminResponse>(`${this.apiBaseUrl}/v1/admin/vendors`, body);
  }

  adminUpdateVendor(id: number, body: SaveVendorRequest) {
    return this.http.put<VendorAdminResponse>(`${this.apiBaseUrl}/v1/admin/vendors/${id}`, body);
  }

  adminDeleteVendor(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/vendors/${id}`);
  }

  adminAssignCustomer(vendorId: number, customerId: number) {
    return this.http.post<void>(`${this.apiBaseUrl}/v1/admin/vendors/${vendorId}/customer`, { customerId });
  }

  adminUnassignCustomer(vendorId: number, customerId: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/vendors/${vendorId}/customer/${customerId}`);
  }
}
