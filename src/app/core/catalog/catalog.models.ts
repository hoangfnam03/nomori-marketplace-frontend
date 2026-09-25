export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
  parentCategoryId: number;
  pictureId: number;
  showOnHomepage: boolean;
  displayOrder: number;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  parentCategoryId: number;
  displayOrder: number;
  children: CategoryTreeNode[];
}

export interface ProductResponse {
  id: number;
  name: string;
  shortDescription: string | null;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  showOnHomepage: boolean;
  displayOrder: number;
  createdOnUtc: string;
}

export interface ProductDetailResponse {
  product: ProductResponse;
  fullDescription: string | null;
  categories: CategoryResponse[];
  manufacturers: ManufacturerResponse[];
}

export interface ManufacturerResponse {
  id: number;
  name: string;
  description: string | null;
  pictureId: number;
  displayOrder: number;
}

export interface AdminCategoryResponse {
  id: number;
  name: string;
  description: string | null;
  parentCategoryId: number;
  pictureId: number;
  showOnHomepage: boolean;
  published: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface AdminProductResponse {
  id: number;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  oldPrice: number;
  stockQuantity: number;
  published: boolean;
  vendorId: number;
  showOnHomepage: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface AdminProductDetailResponse {
  product: AdminProductResponse;
  categoryIds: number[];
  manufacturerIds: number[];
}

export interface AdminManufacturerResponse {
  id: number;
  name: string;
  description: string | null;
  pictureId: number;
  published: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
}
