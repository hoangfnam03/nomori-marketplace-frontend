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

export interface ProductAttributeDetail {
  mappings: ProductAttributeMappingDetail[];
  combinations: ProductAttributeCombination[];
}
