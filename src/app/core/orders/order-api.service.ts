import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { OrderDetail, OrderSummary, PagedResult, ShopOrderDetail, ShopOrderFilter, ShopOrderListItem, ShopOrderStatus } from './order.models';

function filterParams(filter: ShopOrderFilter, page: number, pageSize: number, vendorId?: number | null) {
  let params = new HttpParams().set('page', page).set('pageSize', pageSize);
  if (filter.status) params = params.set('status', filter.status);
  if (filter.search.trim()) params = params.set('search', filter.search.trim());
  if (filter.from) params = params.set('from', filter.from);
  if (filter.to) params = params.set('to', filter.to);
  if (vendorId) params = params.set('vendorId', vendorId);
  return params;
}

/** Orders for the customer (own orders), a shop (its shop orders) and administrators. Orders are never created here: checkout does that. */
@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  // ---- Customer ----
  myOrders(page: number, pageSize: number) {
    return this.http.get<PagedResult<OrderSummary>>(`${this.base}/orders`, { params: new HttpParams().set('page', page).set('pageSize', pageSize) });
  }
  myOrder(id: number) { return this.http.get<OrderDetail>(`${this.base}/orders/${id}`); }
  cancelAsCustomer(shopOrderId: number, reason: string) { return this.http.post<ShopOrderDetail>(`${this.base}/orders/shop-orders/${shopOrderId}/cancel`, { reason }); }
  confirmReceipt(shopOrderId: number) { return this.http.post<ShopOrderDetail>(`${this.base}/orders/shop-orders/${shopOrderId}/confirm-receipt`, {}); }

  // ---- Shop ----
  shopOrders(vendorId: number, filter: ShopOrderFilter, page: number, pageSize: number) {
    return this.http.get<PagedResult<ShopOrderListItem>>(`${this.base}/vendors/${vendorId}/orders`, { params: filterParams(filter, page, pageSize) });
  }
  shopCounts(vendorId: number) { return this.http.get<Record<ShopOrderStatus, number>>(`${this.base}/vendors/${vendorId}/orders/counts`); }
  shopOrder(vendorId: number, id: number) { return this.http.get<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}`); }
  confirm(vendorId: number, id: number) { return this.http.post<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}/confirm`, {}); }
  ship(vendorId: number, id: number, body: { carrier: string; trackingNumber: string }) { return this.http.post<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}/ship`, body); }
  updateTracking(vendorId: number, id: number, body: { carrier: string; trackingNumber: string }) { return this.http.put<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}/tracking`, body); }
  deliver(vendorId: number, id: number) { return this.http.post<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}/deliver`, {}); }
  cancelAsShop(vendorId: number, id: number, reason: string) { return this.http.post<ShopOrderDetail>(`${this.base}/vendors/${vendorId}/orders/${id}/cancel`, { reason }); }

  // ---- Administrator (permission orders.manage) ----
  adminOrders(filter: ShopOrderFilter, vendorId: number | null, page: number, pageSize: number) {
    return this.http.get<PagedResult<OrderSummary>>(`${this.base}/admin/orders`, { params: filterParams(filter, page, pageSize, vendorId) });
  }
  adminOrder(id: number) { return this.http.get<OrderDetail>(`${this.base}/admin/orders/${id}`); }
  cancelAsAdmin(shopOrderId: number, reason: string) { return this.http.post<ShopOrderDetail>(`${this.base}/admin/orders/shop-orders/${shopOrderId}/cancel`, { reason }); }
}
