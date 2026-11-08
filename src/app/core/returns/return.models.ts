export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'withdrawn';

export const RETURN_STATUSES: ReturnStatus[] = ['requested', 'approved', 'rejected', 'received', 'refunded', 'withdrawn'];

export const RETURN_REASONS = ['damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export interface ReturnLine {
  id: number;
  orderLineId: number;
  name: string;
  variantLabel: string | null;
  quantity: number;
  amount: number;
}

export interface ReturnRequest {
  id: number;
  number: string;
  shopOrderId: number;
  orderId: number;
  shopOrderNumber: string;
  vendorId: number;
  shopName: string;
  status: ReturnStatus;
  reason: ReturnReason;
  customerNote: string | null;
  /** What the shop or administrator wrote when deciding. */
  resolutionNote: string | null;
  currencyCode: string;
  /** Worked out by the server when the return was asked for; shipping is not part of it. */
  refundAmount: number;
  /** What the customer actually gets back: the refund less the return shipping they pay. */
  payOut: number;
  /** The carrier's parcel that brings the goods back; null when the customer sends them by themselves. */
  returnTrackingNumber: string | null;
  returnShippingFee: number;
  /** Who bears the return shipping: the customer (taken off the refund) or the shop. */
  returnShippingPaidBy: 'customer' | 'shop' | null;
  /** Where the parcel back is, in words. */
  returnShipmentStatus: string | null;
  /** Why the parcel back could not be made. */
  returnShipmentError: string | null;
  restocked: boolean;
  createdOnUtc: string;
  updatedOnUtc: string;
  lines: ReturnLine[];
}

export interface ReturnPage {
  items: ReturnRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NewReturn {
  shopOrderId: number;
  reason: ReturnReason;
  note: string;
  lines: { orderLineId: number; quantity: number }[];
}
