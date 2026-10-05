export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'voided' | 'failed';

export const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'voided', 'failed'];

/** A payment method as the administrator sees it. A method with no provider (registered = false) cannot be switched on. */
export interface PaymentMethod {
  systemName: string;
  displayName: string;
  isOffline: boolean;
  redirects: boolean;
  enabled: boolean;
  displayOrder: number;
  registered: boolean;
}

export interface Payment {
  id: number;
  referenceType: string;
  referenceId: number;
  method: string;
  customerId: number | null;
  amount: number;
  currencyCode: string;
  status: PaymentStatus;
  refundedAmount: number;
  /** What can still be refunded; 0 unless the payment is paid or partly refunded. */
  refundable: number;
  providerReference: string | null;
  failureCode: string | null;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface PagedPayments {
  items: Payment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
