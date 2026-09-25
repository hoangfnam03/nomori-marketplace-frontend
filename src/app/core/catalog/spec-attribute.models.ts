export interface SpecificationAttributeGroup {
  id: number;
  name: string;
  displayOrder: number;
}

export interface SpecificationAttributeDef {
  id: number;
  name: string;
  specificationAttributeGroupId: number | null;
  displayOrder: number;
}

export interface SpecificationAttributeOption {
  id: number;
  specificationAttributeId: number;
  name: string;
  colorSquaresRgb: string | null;
  displayOrder: number;
}

export type SpecificationAttributeType = 'Option' | 'CustomText' | 'Hyperlink';

export interface ProductSpecificationMapping {
  id: number;
  productId: number;
  attributeType: SpecificationAttributeType;
  specificationAttributeOptionId: number | null;
  customValue: string | null;
  allowFiltering: boolean;
  showOnProductPage: boolean;
  displayOrder: number;
}

export interface ProductSpecRow {
  mapping: ProductSpecificationMapping;
  specAttribute: SpecificationAttributeDef;
  displayValue: string;
  colorSquaresRgb: string | null;
}

export interface SpecGroupDetail {
  group: SpecificationAttributeGroup;
  rows: ProductSpecRow[];
}

export interface ProductSpecDetail {
  groups: SpecGroupDetail[];
  ungrouped: ProductSpecRow[];
}

export interface ProductTag {
  id: number;
  name: string;
}
