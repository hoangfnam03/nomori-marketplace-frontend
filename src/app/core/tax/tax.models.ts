export interface TaxCategory {
  id: number;
  name: string;
  /** Products with no assignment are in the default category. */
  isDefault: boolean;
  displayOrder: number;
}

export interface TaxRate {
  id: number;
  categoryId: number;
  countryCode: string;
  /** When set the rate covers only this state; otherwise the whole country. */
  stateProvinceId: number | null;
  percentage: number;
  published: boolean;
}

export interface SaveTaxRateRequest {
  countryCode: string;
  stateProvinceId: number | null;
  percentage: number;
  published: boolean;
}

export interface ProductTax {
  productId: number;
  productName: string;
  taxCategoryId: number;
  taxCategoryName: string;
  /** False when the product has no assignment and so is in the default category. */
  assigned: boolean;
}
