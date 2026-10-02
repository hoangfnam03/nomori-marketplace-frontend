import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import { PagedResult } from './catalog.models';

/** A product as its own shop sees it. Sellers do not control homepage placement or ordering, so those fields are absent. */
export type ProductStatus = 'draft' | 'live' | 'stopped' | 'hiddenByAdmin';

export interface VendorProduct {
  id: number;
  vendorId: number;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  /** True when the status is live. */
  published: boolean;
  status: ProductStatus;
  /** Why an administrator hid the product. Only set while it is hidden. */
  hiddenReason: string | null;
  reviewRequestedOnUtc: string | null;
  /** Only present when a single product is read or saved; lists leave them out. */
  categoryIds: number[] | null;
  manufacturerIds: number[] | null;
  /** Picture ids in display order; only present when a single product is read. */
  pictureIds: number[] | null;
  /** First picture id, or 0 when none. */
  mainPictureId: number;
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
  categoryIds: number[];
  manufacturerIds: number[];
}

/** Product routes of one shop. The API answers 404 to anyone who is not a member of that shop. */
@Injectable({ providedIn: 'root' })
export class VendorProductApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/vendors`;

  list(vendorId: number, options: { page?: number; pageSize?: number; search?: string; status?: ProductStatus } = {}) {
    let params = new HttpParams().set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 20);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
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

  /** Publish (live) or stop (stopped). A product hidden by an administrator cannot be changed. */
  setStatus(vendorId: number, id: number, status: 'live' | 'stopped') {
    return this.http.put<VendorProduct>(`${this.base}/${vendorId}/products/${id}/status`, { status });
  }

  /** Ask an administrator to look at a hidden product again. */
  requestReview(vendorId: number, id: number) {
    return this.http.post<VendorProduct>(`${this.base}/${vendorId}/products/${id}/review-request`, {});
  }

  /** Replace the ordered pictures of a product (maximum 10; the first is the main picture). */
  setPictures(vendorId: number, id: number, pictureIds: number[]) {
    return this.http.put<{ pictureIds: number[] }>(`${this.base}/${vendorId}/products/${id}/pictures`, { pictureIds });
  }

  delete(vendorId: number, id: number) {
    return this.http.delete<void>(`${this.base}/${vendorId}/products/${id}`);
  }
}
