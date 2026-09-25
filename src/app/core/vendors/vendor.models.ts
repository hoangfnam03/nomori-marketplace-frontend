export interface VendorPublicResponse {
  id: number;
  name: string;
  email: string;
  description: string | null;
  pictureId: number;
  displayOrder: number;
}

export interface VendorAdminResponse {
  id: number;
  name: string;
  email: string;
  description: string | null;
  pictureId: number;
  addressId: number;
  active: boolean;
  displayOrder: number;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface VendorPublicPagedResponse {
  items: VendorPublicResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VendorAdminPagedResponse {
  items: VendorAdminResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
