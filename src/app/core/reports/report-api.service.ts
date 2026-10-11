import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Operations, PlatformDashboard, Reconciliation, ShopDashboard } from './report.models';

/** Read-only dashboards: a shop's own, and the platform's. The server decides who may see what. */
@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${inject(API_BASE_URL)}/v1`;

  /** The dates are days (UTC), both included, as `yyyy-MM-dd`. */
  private range(from: string, to: string) { return new HttpParams().set('from', from).set('to', to); }

  shopDashboard(vendorId: number, from: string, to: string) {
    return this.http.get<ShopDashboard>(`${this.root}/vendors/${vendorId}/reports/dashboard`, { params: this.range(from, to) });
  }

  platformDashboard(from: string, to: string) { return this.http.get<PlatformDashboard>(`${this.root}/admin/reports/dashboard`, { params: this.range(from, to) }); }
  operations() { return this.http.get<Operations>(`${this.root}/admin/reports/operations`); }
  reconciliation(from: string, to: string) { return this.http.get<Reconciliation>(`${this.root}/admin/reports/reconciliation`, { params: this.range(from, to) }); }
}
