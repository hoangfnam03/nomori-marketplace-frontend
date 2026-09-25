import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';
import {
  AdminCategoryResponse, AdminManufacturerResponse,
  AdminProductDetailResponse, AdminProductResponse,
  CategoryResponse, CategoryTreeNode, ManufacturerResponse,
  PagedResult, ProductDetailResponse, ProductResponse
} from './catalog.models';
import {
  ProductAttributeSpec, ProductAttributeDetail,
  ProductAttributeMapping, ProductAttributeValue, ProductAttributeCombination
} from './product-attribute.models';
import {
  SpecificationAttributeGroup, SpecificationAttributeDef, SpecificationAttributeOption,
  ProductSpecDetail, ProductTag
} from './spec-attribute.models';

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

  // ---- Product Attributes (public) ----

  getProductAttributes(productId: number) {
    return this.http.get<ProductAttributeDetail>(`${this.apiBaseUrl}/v1/products/${productId}/attributes`);
  }

  // ---- Product Attributes (admin — specs) ----

  adminGetAttributeSpecs() {
    return this.http.get<ProductAttributeSpec[]>(`${this.apiBaseUrl}/v1/admin/catalog/product-attributes`);
  }

  adminCreateAttributeSpec(body: { name: string; description?: string | null; displayOrder?: number }) {
    return this.http.post<ProductAttributeSpec>(`${this.apiBaseUrl}/v1/admin/catalog/product-attributes`, body);
  }

  adminUpdateAttributeSpec(id: number, body: { name: string; description?: string | null; displayOrder?: number }) {
    return this.http.put<ProductAttributeSpec>(`${this.apiBaseUrl}/v1/admin/catalog/product-attributes/${id}`, body);
  }

  adminDeleteAttributeSpec(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/product-attributes/${id}`);
  }

  // ---- Product Attributes (admin — per-product) ----

  adminGetProductAttributes(productId: number) {
    return this.http.get<ProductAttributeDetail>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes`);
  }

  adminAddMapping(productId: number, body: { productAttributeId: number; textPrompt?: string | null; isRequired?: boolean; controlType?: string; displayOrder?: number }) {
    return this.http.post<ProductAttributeMapping>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings`, body);
  }

  adminUpdateMapping(productId: number, id: number, body: { textPrompt?: string | null; isRequired?: boolean; controlType?: string; displayOrder?: number }) {
    return this.http.put<ProductAttributeMapping>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings/${id}`, body);
  }

  adminDeleteMapping(productId: number, id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings/${id}`);
  }

  adminAddValue(productId: number, mappingId: number, body: { name: string; colorSquaresRgb?: string | null; priceAdjustment?: number; isPreSelected?: boolean; displayOrder?: number }) {
    return this.http.post<ProductAttributeValue>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings/${mappingId}/values`, body);
  }

  adminUpdateValue(productId: number, mappingId: number, id: number, body: { name: string; colorSquaresRgb?: string | null; priceAdjustment?: number; isPreSelected?: boolean; displayOrder?: number }) {
    return this.http.put<ProductAttributeValue>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings/${mappingId}/values/${id}`, body);
  }

  adminDeleteValue(productId: number, mappingId: number, id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/mappings/${mappingId}/values/${id}`);
  }

  adminAddCombination(productId: number, body: { attributesJson: string; stockQuantity?: number; allowOutOfStockOrders?: boolean; sku?: string | null; overriddenPrice?: number | null }) {
    return this.http.post<ProductAttributeCombination>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/combinations`, body);
  }

  adminDeleteCombination(productId: number, id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/products/${productId}/attributes/combinations/${id}`);
  }

  // ---- Spec attributes (public) ----

  getProductSpecs(productId: number) {
    return this.http.get<ProductSpecDetail>(`${this.apiBaseUrl}/v1/products/${productId}/specs`);
  }

  getProductTags(productId: number) {
    return this.http.get<ProductTag[]>(`${this.apiBaseUrl}/v1/products/${productId}/tags`);
  }

  // ---- Spec attributes (admin — global definitions) ----

  adminGetSpecGroups() {
    return this.http.get<SpecificationAttributeGroup[]>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/groups`);
  }

  adminCreateSpecGroup(body: { name: string; displayOrder?: number }) {
    return this.http.post<SpecificationAttributeGroup>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/groups`, body);
  }

  adminUpdateSpecGroup(id: number, body: { name: string; displayOrder?: number }) {
    return this.http.put<SpecificationAttributeGroup>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/groups/${id}`, body);
  }

  adminDeleteSpecGroup(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/groups/${id}`);
  }

  adminGetSpecAttrs() {
    return this.http.get<SpecificationAttributeDef[]>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes`);
  }

  adminCreateSpecAttr(body: { name: string; groupId?: number | null; displayOrder?: number }) {
    return this.http.post<SpecificationAttributeDef>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes`, body);
  }

  adminUpdateSpecAttr(id: number, body: { name: string; groupId?: number | null; displayOrder?: number }) {
    return this.http.put<SpecificationAttributeDef>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${id}`, body);
  }

  adminDeleteSpecAttr(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${id}`);
  }

  adminGetSpecOptions(specAttrId: number) {
    return this.http.get<SpecificationAttributeOption[]>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${specAttrId}/options`);
  }

  adminCreateSpecOption(specAttrId: number, body: { name: string; colorSquaresRgb?: string | null; displayOrder?: number }) {
    return this.http.post<SpecificationAttributeOption>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${specAttrId}/options`, body);
  }

  adminUpdateSpecOption(specAttrId: number, id: number, body: { name: string; colorSquaresRgb?: string | null; displayOrder?: number }) {
    return this.http.put<SpecificationAttributeOption>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${specAttrId}/options/${id}`, body);
  }

  adminDeleteSpecOption(specAttrId: number, id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/spec-attributes/${specAttrId}/options/${id}`);
  }

  // ---- Tags (admin) ----

  adminGetAllTags() {
    return this.http.get<ProductTag[]>(`${this.apiBaseUrl}/v1/admin/catalog/tags`);
  }

  adminDeleteTag(id: number) {
    return this.http.delete<void>(`${this.apiBaseUrl}/v1/admin/catalog/tags/${id}`);
  }

  adminSetProductTags(productId: number, tagNames: string[]) {
    return this.http.put<ProductTag[]>(`${this.apiBaseUrl}/v1/admin/products/${productId}/tags`, { tagNames });
  }
}
