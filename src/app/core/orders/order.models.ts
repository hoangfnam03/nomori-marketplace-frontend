import { CartLine } from '../cart/cart.models';

export type StoreOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'voided' | 'refunded';
export type OrderOverallStatus = 'processing' | 'delivered' | 'cancelled';
export type OrderActor = 'customer' | 'vendor' | 'admin' | 'system';
export type OrderTab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type CancelReason = 'change_address' | 'change_items' | 'changed_mind' | 'better_price' | 'other';

export const ORDER_TABS: readonly OrderTab[] = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
export const CANCEL_REASONS: readonly CancelReason[] = ['change_address', 'change_items', 'changed_mind', 'better_price', 'other'];

export type VendorOrderTab = 'all' | StoreOrderStatus;
export type VendorCancelReason = 'out_of_stock' | 'cannot_contact' | 'wrong_price' | 'other';

export const VENDOR_ORDER_TABS: readonly VendorOrderTab[] = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'];
export const VENDOR_CANCEL_REASONS: readonly VendorCancelReason[] = ['out_of_stock', 'cannot_contact', 'wrong_price', 'other'];

/** Every reason code an order history can show, with a translation under orders.cancelReason. */
export const KNOWN_REASONS: readonly string[] = [...CANCEL_REASONS, 'out_of_stock', 'cannot_contact', 'wrong_price', 'not_confirmed_in_time', 'admin'];

/** Carriers offered when shipping; anything else is typed in after choosing "other". */
export const CARRIERS: readonly string[] = ['GHN', 'GHTK', 'Viettel Post', 'J&T Express', 'VNPost', 'Ninja Van', 'Ahamove'];

/** Business-rule codes of the order API (HTTP 409, in ProblemDetails.detail, exposed as error.message). */
export const ORDER_ERRORS = {
  totalChanged: 'order.total_changed',
  itemsUnavailable: 'order.items_unavailable',
  cartItemNotFound: 'order.cart_item_not_found',
  addressInvalid: 'order.address_invalid',
  invalidTransition: 'store_order.invalid_transition',
  concurrentUpdate: 'store_order.concurrent_update'
} as const;

export interface CheckoutShopGroup {
  vendorId: number;
  vendorName: string | null;
  lines: CartLine[];
  itemsTotal: number;
  shippingFee: number;
  total: number;
}

/** What placing the order would create right now. Amounts are in the primary currency. */
export interface CheckoutPreview {
  currencyCode: string;
  groups: CheckoutShopGroup[];
  itemsTotal: number;
  shippingTotal: number;
  total: number;
  canPlace: boolean;
  missingCartItemIds: number[];
  ownShopCartItemIds: number[];
}

export interface PlaceOrderRequest {
  cartItemIds: number[];
  addressId: number;
  paymentMethod: 'cashOnDelivery';
  /** Note for each shop, keyed by vendor id. */
  notes: Record<number, string>;
  /** The total the customer saw; the API refuses the order when its own total differs. */
  expectedTotal: number;
}

export interface OrderAddress {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  stateProvince: string | null;
  countryCode: string;
  zipPostalCode: string | null;
  phoneNumber: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  variantDescription: string | null;
  sku: string | null;
  pictureId: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface StoreOrderEvent {
  fromStatus: StoreOrderStatus | null;
  toStatus: StoreOrderStatus;
  /** Who made the change, as a role; never a name. */
  actor: OrderActor;
  reason: string | null;
  note: string | null;
  createdOnUtc: string;
  /** Which shop member acted; sent to the shop only, never to the customer. */
  actorName?: string | null;
}

export interface StoreOrder {
  id: number;
  orderId: number;
  orderNumber: string | null;
  subOrderNumber: string;
  vendorId: number;
  vendorName: string | null;
  status: StoreOrderStatus;
  paymentStatus: PaymentStatus;
  itemsTotal: number;
  shippingFee: number;
  total: number;
  customerNote: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  confirmByUtc: string;
  createdOnUtc: string;
  deliveredOnUtc: string | null;
  cancelledOnUtc: string | null;
  cancelReason: string | null;
  cancelNote: string | null;
  cancelledBy: OrderActor | null;
  /** For the viewer: the customer may cancel while pending; the shop may cancel until it ships. */
  canCancel: boolean;
  canConfirmReceipt: boolean;
  canReorder: boolean;
  /** Shop actions; always false for the customer. */
  canConfirm: boolean;
  canShip: boolean;
  canMarkDelivered: boolean;
  canEditShipment: boolean;
  /** Filled in the shop's list. */
  recipientName: string | null;
  recipientPhone: string | null;
  itemCount: number;
  items: OrderItem[];
  /** Filled on the order detail; empty in the list. */
  events: StoreOrderEvent[];
}

export interface Order {
  id: number;
  orderNumber: string;
  createdOnUtc: string;
  currencyCode: string;
  itemsTotal: number;
  shippingTotal: number;
  total: number;
  paymentMethod: 'cashOnDelivery';
  paymentStatus: PaymentStatus;
  overallStatus: OrderOverallStatus;
  shippingAddress: OrderAddress;
  canCancelAll: boolean;
  storeOrders: StoreOrder[];
}

export interface StoreOrderPage {
  items: StoreOrder[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tabCounts: Record<OrderTab, number>;
}

export interface BulkConfirmResult {
  confirmed: number[];
  skipped: number[];
}

export interface ReorderResult {
  addedProductIds: number[];
  failed: { productId: number; productName: string; reason: string }[];
  cartCount: number;
}
