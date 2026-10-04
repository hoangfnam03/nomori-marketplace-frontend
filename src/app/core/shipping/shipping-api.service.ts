import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { SaveShippingRateRequest, ShippingQuote, ShippingQuoteRequest, ShippingRate } from './shipping.models';

/** Shipping rates of a shop (members of that shop only) and the shipping quote of the customer's own cart. */
@Injectable({ providedIn: 'root' })
export class ShippingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  rates(vendorId: number) { return this.http.get<ShippingRate[]>(`${this.base}/vendors/${vendorId}/shipping-rates`); }
  createRate(vendorId: number, body: SaveShippingRateRequest) { return this.http.post<ShippingRate>(`${this.base}/vendors/${vendorId}/shipping-rates`, body); }
  updateRate(vendorId: number, id: number, body: SaveShippingRateRequest) { return this.http.put<ShippingRate>(`${this.base}/vendors/${vendorId}/shipping-rates/${id}`, body); }
  deleteRate(vendorId: number, id: number) { return this.http.delete<void>(`${this.base}/vendors/${vendorId}/shipping-rates/${id}`); }

  quote(body: ShippingQuoteRequest) { return this.http.post<ShippingQuote>(`${this.base}/shipping/quote`, body); }
}
