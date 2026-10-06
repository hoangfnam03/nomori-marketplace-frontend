import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { NewReturn, ReturnPage, ReturnRequest, ReturnStatus } from './return.models';

function listParams(status: ReturnStatus | '', page: number, pageSize: number) {
  let params = new HttpParams().set('page', page).set('pageSize', pageSize);
  if (status) params = params.set('status', status);
  return params;
}

/** Return requests: the customer's own, a shop's and the platform's. The server decides who may see and do what. */
@Injectable({ providedIn: 'root' })
export class ReturnApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  // ---- Customer ----
  myReturns(page: number, pageSize: number) {
    return this.http.get<ReturnPage>(`${this.base}/returns`, { params: listParams('', page, pageSize) });
  }
  request(body: NewReturn) { return this.http.post<ReturnRequest>(`${this.base}/returns`, body); }
  withdraw(id: number) { return this.http.post<ReturnRequest>(`${this.base}/returns/${id}/withdraw`, {}); }

  // ---- Shop ----
  shopReturns(vendorId: number, status: ReturnStatus | '', page: number, pageSize: number) {
    return this.http.get<ReturnPage>(`${this.base}/vendors/${vendorId}/returns`, { params: listParams(status, page, pageSize) });
  }
  shopApprove(vendorId: number, id: number, note: string) { return this.http.post<ReturnRequest>(`${this.base}/vendors/${vendorId}/returns/${id}/approve`, { note }); }
  shopReject(vendorId: number, id: number, note: string) { return this.http.post<ReturnRequest>(`${this.base}/vendors/${vendorId}/returns/${id}/reject`, { note }); }
  shopReceive(vendorId: number, id: number, restock: boolean) { return this.http.post<ReturnRequest>(`${this.base}/vendors/${vendorId}/returns/${id}/receive`, { restock }); }

  // ---- Administrator ----
  adminReturns(status: ReturnStatus | '', page: number, pageSize: number) {
    return this.http.get<ReturnPage>(`${this.base}/admin/returns`, { params: listParams(status, page, pageSize) });
  }
  adminApprove(id: number, note: string) { return this.http.post<ReturnRequest>(`${this.base}/admin/returns/${id}/approve`, { note }); }
  adminReject(id: number, note: string) { return this.http.post<ReturnRequest>(`${this.base}/admin/returns/${id}/reject`, { note }); }
  adminReceive(id: number, restock: boolean) { return this.http.post<ReturnRequest>(`${this.base}/admin/returns/${id}/receive`, { restock }); }
  adminRefund(id: number, manual: boolean) { return this.http.post<ReturnRequest>(`${this.base}/admin/returns/${id}/refund`, { manual }); }
}
