import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Discount, SaveDiscountRequest } from './discount.models';

/**
 * Discounts of one scope: a shop (members of that shop only) or, with no shop, the platform (permission discounts.manage).
 * The same calls serve both, so one screen can manage either.
 */
@Injectable({ providedIn: 'root' })
export class DiscountApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  private path(vendorId: number | null) { return vendorId ? `${this.base}/vendors/${vendorId}/discounts` : `${this.base}/admin/discounts`; }

  list(vendorId: number | null) { return this.http.get<Discount[]>(this.path(vendorId)); }
  create(vendorId: number | null, body: SaveDiscountRequest) { return this.http.post<Discount>(this.path(vendorId), body); }
  update(vendorId: number | null, id: number, body: SaveDiscountRequest) { return this.http.put<Discount>(`${this.path(vendorId)}/${id}`, body); }
  delete(vendorId: number | null, id: number) { return this.http.delete<void>(`${this.path(vendorId)}/${id}`); }
}
