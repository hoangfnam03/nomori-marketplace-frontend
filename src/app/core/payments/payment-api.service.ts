import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { PagedPayments, Payment, PaymentMethod, PaymentStatus } from './payment.models';

/** Payment methods and payments for administrators (permission payments.manage). */
@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/admin`;

  methods() { return this.http.get<PaymentMethod[]>(`${this.base}/payment-methods`); }
  updateMethod(systemName: string, body: { enabled: boolean; displayOrder: number }) {
    return this.http.put<PaymentMethod>(`${this.base}/payment-methods/${encodeURIComponent(systemName)}`, body);
  }

  payments(status: PaymentStatus | '', page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<PagedPayments>(`${this.base}/payments`, { params });
  }

  capture(id: number) { return this.http.post<Payment>(`${this.base}/payments/${id}/capture`, {}); }
  void(id: number) { return this.http.post<Payment>(`${this.base}/payments/${id}/void`, {}); }
  refund(id: number, amount: number) { return this.http.post<Payment>(`${this.base}/payments/${id}/refund`, { amount }); }
}
