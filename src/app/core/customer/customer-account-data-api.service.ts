import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';

export interface CustomerAddress { id: number; firstName: string; lastName: string; company?: string | null; address1: string; address2?: string | null; city: string; stateProvince?: string | null; countryCode: string; zipPostalCode?: string | null; phoneNumber: string; isDefault: boolean; }
export interface CustomerAttributeDefinition { systemName: string; name: string; dataType: string; isRequired: boolean; displayOrder: number; }
export interface CustomerAttributes { definitions: CustomerAttributeDefinition[]; values: Record<string, string>; }

@Injectable({ providedIn: 'root' })
export class CustomerAccountDataApiService {
  private readonly http = inject(HttpClient); private readonly base = inject(API_BASE_URL);
  addresses() { return this.http.get<CustomerAddress[]>(`${this.base}/v1/customer/addresses`); }
  saveAddress(address: Omit<CustomerAddress, 'id'> & { id?: number }) { return address.id ? this.http.put<CustomerAddress>(`${this.base}/v1/customer/addresses/${address.id}`, address) : this.http.post<CustomerAddress>(`${this.base}/v1/customer/addresses`, address); }
  deleteAddress(id: number) { return this.http.delete<void>(`${this.base}/v1/customer/addresses/${id}`); }
  attributes() { return this.http.get<CustomerAttributes>(`${this.base}/v1/customer/attributes`); }
  saveAttributes(values: Record<string, string | null>) { return this.http.put<void>(`${this.base}/v1/customer/attributes`, values); }
  requestEmailChange(newEmail: string, currentPassword: string) { return this.http.post<{ message: string; verificationToken?: string }>(`${this.base}/v1/customer/email-change/request`, { newEmail, currentPassword }); }
  confirmEmailChange(token: string) { return this.http.get<void>(`${this.base}/v1/customer/email-change/confirm`, { params: { token } }); }
}
