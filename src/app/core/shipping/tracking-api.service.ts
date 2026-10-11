import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Carrier, CarrierName, NewTrackingEvent, SaveCarrier, Tracking } from './tracking.models';

/** The journey of a parcel and the carriers a shop can pick. The server decides who may see and do what. */
@Injectable({ providedIn: 'root' })
export class TrackingApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${inject(API_BASE_URL)}/v1`;

  /** One route for the customer who bought it, the shop and the administrator. */
  tracking(shopOrderId: number) { return this.http.get<Tracking>(`${this.root}/shop-orders/${shopOrderId}/tracking`); }

  addEvent(vendorId: number, shopOrderId: number, body: NewTrackingEvent) {
    return this.http.post<Tracking>(`${this.root}/vendors/${vendorId}/orders/${shopOrderId}/tracking-events`, body);
  }

  carrierNames() { return this.http.get<CarrierName[]>(`${this.root}/shipping/carriers`); }

  // ---- Administrator (permission orders.manage) ----
  adminCarriers() { return this.http.get<Carrier[]>(`${this.root}/admin/shipping/carriers`); }
  createCarrier(body: SaveCarrier) { return this.http.post<Carrier>(`${this.root}/admin/shipping/carriers`, body); }
  updateCarrier(id: number, body: SaveCarrier) { return this.http.put<Carrier>(`${this.root}/admin/shipping/carriers/${id}`, body); }
  deleteCarrier(id: number) { return this.http.delete<void>(`${this.root}/admin/shipping/carriers/${id}`); }
}
