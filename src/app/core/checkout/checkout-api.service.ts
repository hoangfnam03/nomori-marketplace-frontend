import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { CheckoutChoices, CheckoutPreview, PlaceOrderRequest, PlacedOrder } from './checkout.models';

/** Checkout of the signed-in customer's own cart. Both routes answer 401 to a guest. */
@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/checkout`;

  /** Changes nothing: the cart, the options for the address and the totals, with every problem found. */
  preview(choices: CheckoutChoices) { return this.http.post<CheckoutPreview>(`${this.base}/preview`, choices); }

  place(request: PlaceOrderRequest) { return this.http.post<PlacedOrder>(`${this.base}/place`, request); }
}
