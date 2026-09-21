import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../../core/config/api-config';

export interface AdminRole {
  id: number;
  name: string;
  systemName: string;
  isSystemRole: boolean;
}

export interface CustomerRolesResponse {
  customerId: number;
  roles: AdminRole[];
}

export interface AdminAuditLog {
  id: number;
  eventName: string;
  customerId: number | null;
  targetCustomerId: number | null;
  entityType: string | null;
  entityId: number | null;
  ipAddress: string | null;
  detailsJson: string | null;
  createdOnUtc: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthorizationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getRoles() {
    return this.http.get<AdminRole[]>(`${this.apiBaseUrl}/v1/admin/authorization/roles`);
  }

  getCustomerRoles(customerId: number) {
    return this.http.get<CustomerRolesResponse>(`${this.apiBaseUrl}/v1/admin/authorization/customers/${customerId}/roles`);
  }

  replaceCustomerRoles(customerId: number, roleSystemNames: string[]) {
    return this.http.put<CustomerRolesResponse>(
      `${this.apiBaseUrl}/v1/admin/authorization/customers/${customerId}/roles`,
      { roleSystemNames });
  }

  getAuditLogs(take = 100) {
    return this.http.get<AdminAuditLog[]>(`${this.apiBaseUrl}/v1/admin/authorization/audit-logs`, { params: { take } });
  }
}
