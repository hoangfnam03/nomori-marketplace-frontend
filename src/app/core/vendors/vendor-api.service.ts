import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import {
  ChangeVendorApplicationStatusRequest, CreateVendorMemberRequest, PagedResponse,
  SaveVendorApplicationRequest, VendorApplicationResponse, VendorApplicationStatus,
  VendorMemberCreatedResponse, VendorMemberResponse, VendorNoteResponse, VendorPagedResponse, VendorResponse
} from './vendor.models';

export interface UpdateVendorRequest {
  name: string;
  email: string;
  description?: string | null;
  adminComment?: string | null;
  active?: boolean;
  displayOrder?: number;
}

/** One set of routes for every caller; the API decides what each caller may see. */
@Injectable({ providedIn: 'root' })
export class VendorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  // Vendors
  getVendors(page = 1, pageSize = 20, search?: string, active?: boolean) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<VendorPagedResponse>(`${this.base}/vendors`, { params });
  }

  getVendor(id: number) {
    return this.http.get<VendorResponse>(`${this.base}/vendors/${id}`);
  }

  updateVendor(id: number, body: UpdateVendorRequest) {
    return this.http.put<VendorResponse>(`${this.base}/vendors/${id}`, body);
  }

  deleteVendor(id: number) {
    return this.http.delete<void>(`${this.base}/vendors/${id}`);
  }

  // Notes (administrators)
  getNotes(vendorId: number, page = 1, pageSize = 20) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResponse<VendorNoteResponse>>(`${this.base}/vendors/${vendorId}/notes`, { params });
  }

  addNote(vendorId: number, note: string) {
    return this.http.post<VendorNoteResponse>(`${this.base}/vendors/${vendorId}/notes`, { note });
  }

  deleteNote(vendorId: number, noteId: number) {
    return this.http.delete<void>(`${this.base}/vendors/${vendorId}/notes/${noteId}`);
  }

  // Members
  getMembers(vendorId: number) {
    return this.http.get<VendorMemberResponse[]>(`${this.base}/vendors/${vendorId}/members`);
  }

  createMember(vendorId: number, body: CreateVendorMemberRequest) {
    return this.http.post<VendorMemberCreatedResponse>(`${this.base}/vendors/${vendorId}/members`, body);
  }

  resendSetupEmail(vendorId: number, customerId: number) {
    return this.http.post<{ developmentSetupToken: string | null }>(
      `${this.base}/vendors/${vendorId}/members/${customerId}/setup-email`, {});
  }

  removeMember(vendorId: number, customerId: number) {
    return this.http.delete<void>(`${this.base}/vendors/${vendorId}/members/${customerId}`);
  }

  // Applications
  submitApplication(body: SaveVendorApplicationRequest) {
    return this.http.post<VendorApplicationResponse>(`${this.base}/vendor-applications`, body);
  }

  getApplications(options: { status?: VendorApplicationStatus; search?: string; page?: number; pageSize?: number } = {}) {
    let params = new HttpParams().set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 20);
    if (options.status) params = params.set('status', options.status);
    if (options.search) params = params.set('search', options.search);
    return this.http.get<PagedResponse<VendorApplicationResponse>>(`${this.base}/vendor-applications`, { params });
  }

  getApplication(id: number) {
    return this.http.get<VendorApplicationResponse>(`${this.base}/vendor-applications/${id}`);
  }

  updateApplication(id: number, body: SaveVendorApplicationRequest) {
    return this.http.put<VendorApplicationResponse>(`${this.base}/vendor-applications/${id}`, body);
  }

  changeApplicationStatus(id: number, body: ChangeVendorApplicationStatusRequest) {
    return this.http.put<VendorApplicationResponse>(`${this.base}/vendor-applications/${id}/status`, body);
  }
}
