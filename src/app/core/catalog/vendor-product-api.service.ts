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
  trackInventory: boolean;
  lowStockThreshold: number;
  /** Tracked and at or below the threshold. */
  isLowStock: boolean;
  sku: string | null;
  gtin: string | null;
  manufacturerPartNumber: string | null;
  /** Optional sale window (UTC). A live product outside it is not shown to customers. */
  availableStartUtc: string | null;
  availableEndUtc: string | null;
  /** Related product ids in display order; only present when a single product is read. */
  relatedProductIds: number[] | null;
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
  sku?: string | null;
  gtin?: string | null;
  manufacturerPartNumber?: string | null;
  availableStartUtc?: string | null;
  availableEndUtc?: string | null;
}

export interface StockLevel {
  onHand: number;
  reserved: number;
  /** What customers can still buy. */
  available: number;
}

export interface InventoryOverview {
  trackInventory: boolean;
  lowStockThreshold: number;
  isLowStock: boolean;
  stock: StockLevel;
  combinations: { id: number; sku: string | null; attributesJson: string; stock: StockLevel }[];
}

export type StockReason = 'restock' | 'correction' | 'damage' | 'return';

export interface StockMovement {
  id: number;
  combinationId: number | null;
  delta: number;
  quantityAfter: number;
  reason: string;
  reference: string | null;
  note: string | null;
  createdOnUtc: string;
}

/** Platform-owned definitions a seller can pick from. */
export interface OptionCatalog {
  attributes: { id: number; name: string }[];
  specAttributes: { id: number; name: string; groupName: string | null; options: { id: number; name: string }[] }[];
}

export interface VariantValueInput {
  name: string;
  colorSquaresRgb: string | null;
  priceAdjustment: number;
}

export interface VariantAttributeInput {
  productAttributeId: number;
  isRequired: boolean;
  values: VariantValueInput[];
}

/** One index per attribute (in attribute order) into that attribute's values. */
export interface VariantCombinationInput {
  valueIndexes: number[];
  sku: string | null;
  stockQuantity: number;
  overriddenPrice: number | null;
}

export interface SaveVariantsRequest {
  attributes: VariantAttributeInput[];
  combinations: VariantCombinationInput[];
}

export interface VariantsResponse {
  mappings: {
    id: number;
    isRequired: boolean;
    displayOrder: number;
    attribute: { id: number; name: string };
    values: { id: number; name: string; colorSquaresRgb: string | null; priceAdjustment: number; displayOrder: number }[];
  }[];
  combinations: { id: number; attributesJson: string; stockQuantity: number; sku: string | null; overriddenPrice: number | null }[];
}

/** Product routes of one shop. The API answers 404 to anyone who is not a member of that shop. */
@Injectable({ providedIn: 'root' })
export class VendorProductApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/vendors`;

  list(vendorId: number, options: { page?: number; pageSize?: number; search?: string; status?: ProductStatus; lowStock?: boolean } = {}) {
    let params = new HttpParams().set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 20);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.lowStock) params = params.set('lowStock', true);
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

  /** Replace the ordered related products of a product (maximum 12, products of the same shop). */
  setRelated(vendorId: number, id: number, productIds: number[]) {
    return this.http.put<{ relatedProductIds: number[] }>(`${this.base}/${vendorId}/products/${id}/related`, { productIds });
  }

  /** Copy a product into a new draft of the same shop (no SKU, pictures or related products). */
  copy(vendorId: number, id: number) {
    return this.http.post<VendorProduct>(`${this.base}/${vendorId}/products/${id}/copy`, {});
  }

  getInventory(vendorId: number, id: number) {
    return this.http.get<InventoryOverview>(`${this.base}/${vendorId}/products/${id}/inventory`);
  }

  /** Change stock by a signed amount. A product with variants needs the combination id. */
  adjustStock(vendorId: number, id: number, body: { combinationId: number | null; delta: number; reason: StockReason; note?: string | null }) {
    return this.http.post<InventoryOverview>(`${this.base}/${vendorId}/products/${id}/stock-adjustments`, body);
  }

  setInventorySettings(vendorId: number, id: number, body: { trackInventory: boolean; lowStockThreshold: number }) {
    return this.http.put<InventoryOverview>(`${this.base}/${vendorId}/products/${id}/inventory-settings`, body);
  }

  getStockMovements(vendorId: number, id: number, page = 1, pageSize = 10) {
    return this.http.get<PagedResult<StockMovement>>(`${this.base}/${vendorId}/products/${id}/stock-movements`, {
      params: new HttpParams().set('page', page).set('pageSize', pageSize)
    });
  }

  getOptions(vendorId: number) {
    return this.http.get<OptionCatalog>(`${this.base}/${vendorId}/product-options`);
  }

  getVariants(vendorId: number, id: number) {
    return this.http.get<VariantsResponse>(`${this.base}/${vendorId}/products/${id}/variants`);
  }

  /** Replace attributes, values and combinations. The product stock becomes the sum of the combination stocks. */
  setVariants(vendorId: number, id: number, body: SaveVariantsRequest) {
    return this.http.put<VariantsResponse>(`${this.base}/${vendorId}/products/${id}/variants`, body);
  }

  getSpecs(vendorId: number, id: number) {
    return this.http.get<{ optionIds: number[] }>(`${this.base}/${vendorId}/products/${id}/specs`);
  }

  setSpecs(vendorId: number, id: number, optionIds: number[]) {
    return this.http.put<{ optionIds: number[] }>(`${this.base}/${vendorId}/products/${id}/specs`, { optionIds });
  }

  getTags(vendorId: number, id: number) {
    return this.http.get<{ tagNames: string[] }>(`${this.base}/${vendorId}/products/${id}/tags`);
  }

  setTags(vendorId: number, id: number, tagNames: string[]) {
    return this.http.put<{ tagNames: string[] }>(`${this.base}/${vendorId}/products/${id}/tags`, { tagNames });
  }

  delete(vendorId: number, id: number) {
    return this.http.delete<void>(`${this.base}/${vendorId}/products/${id}`);
  }
}
