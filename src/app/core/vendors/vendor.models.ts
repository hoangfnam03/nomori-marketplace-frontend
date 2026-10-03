export interface VendorResponse {
  id: number;
  name: string;
  email: string;
  description: string | null;
  pictureId: number;
  displayOrder: number;
  /** Null unless the caller is an administrator or a member of this vendor. */
  active: boolean | null;
  addressId: number | null;
  createdOnUtc: string | null;
  updatedOnUtc: string | null;
  /** Administrators only. */
  adminComment: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type VendorPagedResponse = PagedResponse<VendorResponse>;

export interface VendorNoteResponse {
  id: number;
  vendorId: number;
  note: string;
  createdOnUtc: string;
}

export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface VendorApplicationResponse {
  id: number;
  shopName: string;
  email: string;
  phoneNumber: string;
  description: string | null;
  taxCode: string | null;
  businessAddress: string | null;
  status: VendorApplicationStatus;
  rejectReason: string | null;
  vendorId: number | null;
  createdOnUtc: string;
  updatedOnUtc: string;
  reviewedOnUtc: string | null;
  /** Administrators only. */
  customerId: number | null;
  customerEmail: string | null;
  customerUsername: string | null;
  reviewedByCustomerId: number | null;
}

export interface SaveVendorApplicationRequest {
  shopName: string;
  email: string;
  phoneNumber: string;
  description?: string | null;
  taxCode?: string | null;
  businessAddress?: string | null;
}

export interface ChangeVendorApplicationStatusRequest {
  status: 'approved' | 'rejected' | 'cancelled';
  reason?: string | null;
  shopName?: string | null;
  adminComment?: string | null;
}

export type VendorMemberStatus = 'pendingSetup' | 'active';

export interface VendorMemberResponse {
  customerId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: VendorMemberStatus;
  isCurrentUser: boolean;
  createdOnUtc: string;
  lastLoginDateUtc: string | null;
}

export interface VendorMemberCreatedResponse extends VendorMemberResponse {
  developmentSetupToken: string | null;
}

export interface CreateVendorMemberRequest {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}
