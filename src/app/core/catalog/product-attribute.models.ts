export interface ProductAttributeSpec {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface ProductAttributeMapping {
  id: number;
  productId: number;
  productAttributeId: number;
  textPrompt: string | null;
  isRequired: boolean;
  controlType: string;
  displayOrder: number;
}

export interface ProductAttributeValue {
  id: number;
  productAttributeMappingId: number;
  name: string;
  colorSquaresRgb: string | null;
  priceAdjustment: number;
  isPreSelected: boolean;
  displayOrder: number;
}

export interface ProductAttributeCombination {
  id: number;
  productId: number;
  attributesJson: string;
  stockQuantity: number;
  allowOutOfStockOrders: boolean;
  sku: string | null;
  overriddenPrice: number | null;
}

export interface ProductAttributeMappingDetail {
  mapping: ProductAttributeMapping;
  attribute: { id: number; name: string };
  values: ProductAttributeValue[];
  prompt?: string;
  controlType?: string;
  isRequired?: boolean;
  displayOrder?: number;
}

/** What the public attributes route returns: flat mappings (no nested `mapping`), and combinations without the product id. */
export interface PublicAttributeValue {
  id: number;
  name: string;
  colorSquaresRgb: string | null;
  priceAdjustment: number;
  isPreSelected: boolean;
  displayOrder: number;
}

export interface PublicAttributeMapping {
  id: number;
  displayOrder: number;
  isRequired: boolean;
  controlType: string;
  prompt: string;
  attribute: { id: number; name: string };
  values: PublicAttributeValue[];
}

export interface PublicAttributeCombination {
  id: number;
  /** JSON object that maps a mapping id to the chosen value id. */
  attributesJson: string;
  stockQuantity: number;
  allowOutOfStockOrders: boolean;
  sku: string | null;
  overriddenPrice: number | null;
}

export interface PublicAttributeDetail {
  mappings: PublicAttributeMapping[];
  combinations: PublicAttributeCombination[];
}

export interface ProductAttributeDetail {
  mappings: ProductAttributeMappingDetail[];
  combinations: ProductAttributeCombination[];
}
