export type ShopOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type OverallOrderStatus = 'processing' | 'completed' | 'cancelled';

export const SHOP_ORDER_STATUSES: ShopOrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'];

export interface ShopOrderSummary {
  id: number;
  number: string;
  vendorId: number;
  shopName: string;
  status: ShopOrderStatus;
  total: number;
  itemCount: number;
}

export interface OrderSummary {
  id: number;
  number: string;
  currencyCode: string;
  total: number;
  status: OverallOrderStatus;
  paymentMethod: string;
  createdOnUtc: string;
  shopOrders: ShopOrderSummary[];
}

/** One row of a shop's list. It has no customer id or email: a shop only needs to know where to send the parcel. */
export interface ShopOrderListItem {
  id: number;
  number: string;
  orderNumber: string;
  status: ShopOrderStatus;
  createdOnUtc: string;
  itemCount: number;
  total: number;
  shippingFee: number;
  discountAmount: number;
  currencyCode: string;
  paymentMethod: string;
  recipientName: string;
  recipientPhone: string;
}

export interface OrderLine {
  id: number;
  productId: number;
  combinationId: number | null;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  /** Media asset id; 0 when there was none. */
  pictureId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** The percentage charged on this line when it was ordered. */
  taxRate: number;
  taxAmount: number;
}

export interface OrderHistoryEntry {
  fromStatus: ShopOrderStatus | null;
  to: ShopOrderStatus;
  /** "platform" stands for an administrator, whose identity is not shown outside the platform. */
  actor: 'customer' | 'shop' | 'platform' | 'admin' | 'system';
  /** Only administrators get it. */
  actorCustomerId: number | null;
  note: string | null;
  createdOnUtc: string;
}

export interface Recipient {
  name: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
}

export interface ShopOrderDetail {
  id: number;
  number: string;
  orderId: number;
  orderNumber: string;
  vendorId: number;
  shopName: string;
  status: ShopOrderStatus;
  currencyCode: string;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  /** What the discount took off this shop order; who paid for it is in discountFunding. */
  discountAmount: number;
  discountFunding: 'platform' | 'shop' | null;
  /** The tax on this shop order's lines. */
  taxAmount: number;
  total: number;
  shippingMethodName: string;
  carrier: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  customerNote: string | null;
  recipient: Recipient;
  createdOnUtc: string;
  updatedOnUtc: string;
  lines: OrderLine[];
  history: OrderHistoryEntry[];
}

export interface OrderDetail {
  id: number;
  number: string;
  /** Only administrators get it; 0 otherwise. */
  customerId: number;
  currencyCode: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  discountCode: string | null;
  taxTotal: number;
  total: number;
  status: OverallOrderStatus;
  paymentMethod: string;
  customerNote: string | null;
  recipient: Recipient;
  createdOnUtc: string;
  shopOrders: ShopOrderDetail[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ShopOrderFilter {
  status: ShopOrderStatus | '';
  search: string;
  from: string;
  to: string;
}
