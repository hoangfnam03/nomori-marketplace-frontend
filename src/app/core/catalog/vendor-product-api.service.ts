import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import { PagedResult } from './catalog.models';

/** A product as its own shop sees it. Sellers do not control homepage placement or ordering, so those fields are absent. */
export interface VendorProduct {
  id: number;
  vendorId: number;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  published: boolean;
  /** Only present when a single product is read or saved; lists leave them out. */
  categoryIds: number[] | null;
  manufacturerIds: number[] | null;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface SaveVendorProductRequest {
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  published: boolean;
  categoryIds: number[];
  manufacturerIds: number[];
}

/** Product routes of one shop. The API answers 404 to anyone who is not a member of that shop. */
@Injectable({ providedIn: 'root' })
export class VendorProductApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/vendors`;

  list(vendorId: number, options: { page?: number; pageSize?: number; search?: string; published?: boolean } = {}) {
    let params = new HttpParams().set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 20);
    if (options.search) params = params.set('search', options.search);
    if (options.published !== undefined) params = params.set('published', options.published);
    return this.http.get<PagedResult<VendorProduct>>(`${this.base}/${vendorId}/products`, { params });
  }

  get(vendorId: number, id: number) {
    return this.http.get<VendorProduct>(`${this.base}/${vendorId}/products/${id}`);
  }

  create(vendorId: number, body: SaveVendorProductRequest) {
    return this.http.post<VendorProduct>(`${this.base}/${vendorId}/products`, body);
  }

  update(vendorId: number, id: number, body: SaveVendorProductRequest) {
    return this.http.put<VendorProduct>(`${this.base}/${vendorId}/products/${id}`, body);
  }

  delete(vendorId: number, id: number) {
    return this.http.delete<void>(`${this.base}/${vendorId}/products/${id}`);
  }
}
