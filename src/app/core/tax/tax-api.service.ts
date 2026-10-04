import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { ProductTax, SaveTaxRateRequest, TaxCategory, TaxRate } from './tax.models';

/** Tax categories, rates and product assignments for administrators (permission settings.manage). */
@Injectable({ providedIn: 'root' })
export class TaxApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/admin/tax`;

  categories() { return this.http.get<TaxCategory[]>(`${this.base}/categories`); }
  createCategory(body: { name: string; displayOrder: number }) { return this.http.post<TaxCategory>(`${this.base}/categories`, body); }
  updateCategory(id: number, body: { name: string; displayOrder: number }) { return this.http.put<TaxCategory>(`${this.base}/categories/${id}`, body); }
  deleteCategory(id: number) { return this.http.delete<void>(`${this.base}/categories/${id}`); }

  rates(categoryId: number) { return this.http.get<TaxRate[]>(`${this.base}/categories/${categoryId}/rates`); }
  createRate(categoryId: number, body: SaveTaxRateRequest) { return this.http.post<TaxRate>(`${this.base}/categories/${categoryId}/rates`, body); }
  updateRate(id: number, body: SaveTaxRateRequest) { return this.http.put<TaxRate>(`${this.base}/rates/${id}`, body); }
  deleteRate(id: number) { return this.http.delete<void>(`${this.base}/rates/${id}`); }

  product(productId: number) { return this.http.get<ProductTax>(`${this.base}/products/${productId}`); }
  /** A null category returns the product to the default. */
  assignProduct(productId: number, taxCategoryId: number | null) { return this.http.put<ProductTax>(`${this.base}/products/${productId}`, { taxCategoryId }); }
}
