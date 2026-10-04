import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import {
  BulkConfirmResult, CancelReason, CheckoutPreview, Order, OrderTab, PlaceOrderRequest, ReorderResult, StoreOrderPage,
  VendorCancelReason, VendorOrderTab
} from './order.models';

/** Checkout and "My orders". The customer always comes from the session. */
@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  preview(cartItemIds: number[]) {
    return this.http.post<CheckoutPreview>(`${this.base}/checkout/preview`, { cartItemIds });
  }

  /**
   * Places the order. Send the same idempotency key when retrying the same attempt: the API then returns the order it
   * already created instead of creating a second one.
   */
  place(body: PlaceOrderRequest, idempotencyKey: string) {
    return this.http.post<Order>(`${this.base}/orders`, body, { headers: { 'Idempotency-Key': idempotencyKey } });
  }

  list(tab: OrderTab, page: number, pageSize: number, search?: string) {
    let params = new HttpParams().set('status', tab).set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<StoreOrderPage>(`${this.base}/orders`, { params });
  }

  get(id: number) {
    return this.http.get<Order>(`${this.base}/orders/${id}`);
  }

  cancel(storeOrderId: number, reason: CancelReason, note: string | null) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'cancelled', reason, note });
  }

  confirmReceipt(storeOrderId: number) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'delivered' });
  }

  reorder(storeOrderId: number) {
    return this.http.post<ReorderResult>(`${this.base}/store-orders/${storeOrderId}/reorder`, {});
  }

  // ---- Shop ----

  /** @param from first day, yyyy-MM-dd (UTC); @param to last day, yyyy-MM-dd (UTC), inclusive. */
  vendorList(vendorId: number, tab: VendorOrderTab, page: number, pageSize: number, search?: string, from?: string, to?: string) {
    let params = new HttpParams().set('status', tab).set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<StoreOrderPage>(`${this.base}/vendors/${vendorId}/orders`, { params });
  }

  vendorGet(vendorId: number, storeOrderId: number) {
    return this.http.get<Order>(`${this.base}/vendors/${vendorId}/orders/${storeOrderId}`);
  }

  confirmMany(vendorId: number, storeOrderIds: number[]) {
    return this.http.post<BulkConfirmResult>(`${this.base}/vendors/${vendorId}/orders/confirm`, { storeOrderIds });
  }

  confirm(storeOrderId: number) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'confirmed' });
  }

  /** Ships a confirmed order, or corrects the carrier and tracking number of one already shipped. */
  ship(storeOrderId: number, carrier: string, trackingNumber: string) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'shipped', carrier, trackingNumber });
  }

  markDelivered(storeOrderId: number) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'delivered' });
  }

  vendorCancel(storeOrderId: number, reason: VendorCancelReason, note: string | null) {
    return this.http.put<Order>(`${this.base}/store-orders/${storeOrderId}/status`, { status: 'cancelled', reason, note });
  }
}
