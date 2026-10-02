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
  vendorId: number;
  vendorName: string | null;
  /** Media asset id of the first picture; 0 when the product has none. */
  mainPictureId: number;
}

export interface ProductDetailResponse {
  product: ProductResponse;
  fullDescription: string | null;
  /** Picture ids in display order. */
  pictureIds: number[];
  categories: CategoryResponse[];
  manufacturers: ManufacturerResponse[];
  /** Related products that are on sale now, in the order the shop chose. */
  relatedProducts: ProductResponse[];
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
  /** When true, sellers cannot attach products to this category. */
  restrictFromVendors: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface AdminCategoryTreeNode {
  id: number;
  name: string;
  parentCategoryId: number;
  displayOrder: number;
  published: boolean;
  restrictFromVendors: boolean;
  children: AdminCategoryTreeNode[];
}

/** A category a seller may attach products to, with its full path, for example "Fashion > Women". */
export interface SelectableCategory {
  id: number;
  name: string;
  parentCategoryId: number;
  path: string;
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
  vendorName: string | null;
  showOnHomepage: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
  status: 'draft' | 'live' | 'stopped' | 'hiddenByAdmin';
  hiddenReason: string | null;
  hiddenOnUtc: string | null;
  reviewRequestedOnUtc: string | null;
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
