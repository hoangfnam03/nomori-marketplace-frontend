import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, shareReplay, catchError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { ShopOrderDetail } from '../orders/order.models';

export interface GhnProvince { id: number; name: string; }
export interface GhnDistrict { id: number; provinceId: number; name: string; }
export interface GhnWard { code: string; districtId: number; name: string; }

/** Where GHN picks up one shop's parcels; the shop has GHN only once it has one. */
export interface GhnPickup {
  vendorId: number; contactName: string; phone: string; address: string;
  provinceId: number; provinceName: string; districtId: number; districtName: string; wardCode: string; wardName: string;
}
export interface SaveGhnPickup {
  contactName: string; phone: string; address: string;
  provinceId: number; provinceName: string | null; districtId: number; districtName: string | null; wardCode: string | null; wardName: string | null;
}

/** GHN (Giao Hàng Nhanh, prototype): its address lists, and handing a shop order to GHN. Off unless the server is configured. */
@Injectable({ providedIn: 'root' })
export class GhnApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${inject(API_BASE_URL)}/v1`;
  private enabled$?: Observable<boolean>;

  /** Asked once per visit; any failure means GHN is not there. */
  enabled(): Observable<boolean> {
    this.enabled$ ??= this.http.get<{ enabled: boolean }>(`${this.root}/shipping/ghn/status`).pipe(
      map(s => s.enabled), catchError(() => of(false)), shareReplay(1));
    return this.enabled$;
  }

  provinces() { return this.http.get<GhnProvince[]>(`${this.root}/shipping/ghn/provinces`); }
  districts(provinceId: number) { return this.http.get<GhnDistrict[]>(`${this.root}/shipping/ghn/districts`, { params: { provinceId } }); }
  wards(districtId: number) { return this.http.get<GhnWard[]>(`${this.root}/shipping/ghn/wards`, { params: { districtId } }); }

  // ---- Shop ----
  pickup(vendorId: number) { return this.http.get<{ enabled: boolean; pickup: GhnPickup | null }>(`${this.root}/vendors/${vendorId}/ghn/pickup`); }
  savePickup(vendorId: number, body: SaveGhnPickup) { return this.http.put<GhnPickup>(`${this.root}/vendors/${vendorId}/ghn/pickup`, body); }
  deletePickup(vendorId: number) { return this.http.delete<void>(`${this.root}/vendors/${vendorId}/ghn/pickup`); }

  createShipment(vendorId: number, shopOrderId: number) {
    return this.http.post<ShopOrderDetail>(`${this.root}/vendors/${vendorId}/orders/${shopOrderId}/ghn/shipment`, {});
  }
  sync(vendorId: number, shopOrderId: number) {
    return this.http.post<ShopOrderDetail>(`${this.root}/vendors/${vendorId}/orders/${shopOrderId}/ghn/sync`, {});
  }
  label(vendorId: number, shopOrderId: number) {
    return this.http.get<{ url: string }>(`${this.root}/vendors/${vendorId}/orders/${shopOrderId}/ghn/label`);
  }
}

/** The carrier name the server writes on a shop order handed to GHN. */
export const GHN_CARRIER = 'Giao Hang Nhanh';
