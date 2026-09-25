import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import {
  AdminCategoryResponse, AdminManufacturerResponse,
  AdminProductDetailResponse, AdminProductResponse,
  CategoryResponse, CategoryTreeNode, ManufacturerResponse,
  PagedResult, ProductDetailResponse, ProductResponse
} from './catalog.models';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  categoryId?: number | null;
  manufacturerId?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  search?: string | null;
  sort?: string;
}

export interface SaveCategoryRequest {
  name: string;
  description?: string | null;
  parentCategoryId?: number;
  pictureId?: number;
  showOnHomepage?: boolean;
  published?: boolean;
  displayOrder?: number;
}

export interface SaveProductRequest {
  name: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  price?: number;
  oldPrice?: number;
  stockQuantity?: number;
  published?: boolean;
  vendorId?: number;
  showOnHomepage?: boolean;
  displayOrder?: number;
  categoryIds?: number[];
  manufacturerIds?: number[];
}

export interface SaveManufacturerRequest {
  name: string;
  description?: string | null;
  pictureId?: number;
  published?: boolean;
  displayOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  // ---- Public storefront ----

  getCategories(page = 1, pageSize = 20, parentId?: number | null) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (parentId != null) params = params.set('parentId', parentId);
    return this.http.get<PagedResult<CategoryResponse>>(`${this.apiBaseUrl}/v1/catalog/categories`, { params });
  }

  getCategoryTree() {
    return this.http.get<CategoryTreeNode[]>(`${this.apiBaseUrl}/v1/catalog/categories/tree`);
  }

  getCategory(id: number) {
    return this.http.get<CategoryResponse>(`${this.apiBaseUrl}/v1/catalog/categories/${id}`);
  }

  getProducts(p: ProductListParams = {}) {
    let params = new HttpParams()
      .set('page', p.page ?? 1)
      .set('pageSize', p.pageSize ?? 20);
    if (p.categoryId != null) params = params.set('categoryId', p.categoryId);
    if (p.manufacturerId != null) params = params.set('manufacturerId', p.manufacturerId);
    if (p.minPrice != null) params = params.set('minPrice', p.minPrice);
    if (p.maxPrice != null) params = params.set('maxPrice', p.maxPrice);
    if (p.search) params = params.set('search', p.search);
    if (p.sort) params = params.set('sort', p.sort);
    return this.http.get<PagedResult<ProductResponse>>(`${this.apiBaseUrl}/v1/catalog/products`, { params });
  }

  getProduct(id: number) {
    return this.http.get<ProductDetailResponse>(`${this.apiBaseUrl}/v1/catalog/products/${id}`);
  }

  getManufacturers(page = 1, pageSize = 20) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<ManufacturerResponse>>(`${this.apiBaseUrl}/v1/catalog/manufacturers`, { params });
  }

  getManufacturer(id: number) {
    return this.http.get<ManufacturerResponse>(`${this.apiBaseUrl}/v1/catalog/manufacturers/${id}`);
  }

  // ---- Admin ----

  adminGetCategories(page = 1, pageSize = 50) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<AdminCategoryResponse>>(`${this.apiBaseUrl}/v1/admin/catalog/categories`, { params });
  }

  adminGetCategory(id: number) {
    return this.http.get<AdminCategoryResponse>(`${this.apiBaseUrl}/v1/admin/catalog/categories/${id}`);
  }

  adminCreateCategory(request: SaveCategoryRequest) {
    return this.http.post<AdminCategoryResponse>(`${this.apiBaseUrl}/v1/admin/catalog/categories`, request);
  }

  adminUpdateCategory(id: number, request: SaveCategoryRequest) {
    return this.http.put<AdminCategoryResponse>(`${this.apiBaseUrl}/v1/admin/catalog/categories/${id}`, request);
  }

  adminDeleteCategory(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/categories/${id}`);
  }

  adminGetProducts(page = 1, pageSize = 50, search?: string | null) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<PagedResult<AdminProductResponse>>(`${this.apiBaseUrl}/v1/admin/catalog/products`, { params });
  }

  adminGetProduct(id: number) {
    return this.http.get<AdminProductDetailResponse>(`${this.apiBaseUrl}/v1/admin/catalog/products/${id}`);
  }

  adminCreateProduct(request: SaveProductRequest) {
    return this.http.post<AdminProductResponse>(`${this.apiBaseUrl}/v1/admin/catalog/products`, request);
  }

  adminUpdateProduct(id: number, request: SaveProductRequest) {
    return this.http.put<AdminProductResponse>(`${this.apiBaseUrl}/v1/admin/catalog/products/${id}`, request);
  }

  adminDeleteProduct(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/products/${id}`);
  }

  adminGetManufacturers(page = 1, pageSize = 50) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResult<AdminManufacturerResponse>>(`${this.apiBaseUrl}/v1/admin/catalog/manufacturers`, { params });
  }

  adminGetManufacturer(id: number) {
    return this.http.get<AdminManufacturerResponse>(`${this.apiBaseUrl}/v1/admin/catalog/manufacturers/${id}`);
  }

  adminCreateManufacturer(request: SaveManufacturerRequest) {
    return this.http.post<AdminManufacturerResponse>(`${this.apiBaseUrl}/v1/admin/catalog/manufacturers`, request);
  }

  adminUpdateManufacturer(id: number, request: SaveManufacturerRequest) {
    return this.http.put<AdminManufacturerResponse>(`${this.apiBaseUrl}/v1/admin/catalog/manufacturers/${id}`, request);
  }

  adminDeleteManufacturer(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/manufacturers/${id}`);
  }
}
