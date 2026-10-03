import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { AddToCartRequest, CartView } from './cart.models';

/** Routes of the signed-in customer's own cart. They answer 401 to a guest. */
@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/cart`;

  get() { return this.http.get<CartView>(this.base); }
  count() { return this.http.get<{ count: number }>(`${this.base}/count`); }
  add(body: AddToCartRequest) { return this.http.post<CartView>(`${this.base}/items`, body); }
  setQuantity(lineId: number, quantity: number) { return this.http.put<CartView>(`${this.base}/items/${lineId}`, { quantity }); }
  remove(lineId: number) { return this.http.delete<CartView>(`${this.base}/items/${lineId}`); }
  clear() { return this.http.delete<CartView>(this.base); }

  /** Saves the current unit prices as the ones the customer has seen. */
  acceptPrices() { return this.http.post<CartView>(`${this.base}/accept-prices`, {}); }
}
