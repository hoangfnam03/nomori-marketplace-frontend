import { CartView } from '../cart/cart.models';
import { ShippingOption } from '../shipping/shipping.models';

/** What can be wrong with the cart or the choices at checkout. The server gives a stable code for each. */
export type CheckoutProblem =
  | 'cart_empty' | 'cart_issues' | 'prices_changed'
  | 'address_required' | 'address_invalid'
  | 'shipping_unavailable' | 'shipping_not_chosen' | 'shipping_invalid'
  | 'payment_required' | 'payment_invalid';

export interface ShippingChoice {
  vendorId: number;
  rateId: number;
}

export interface CheckoutChoices {
  addressId: number | null;
  shippingChoices: ShippingChoice[];
  paymentMethod: string | null;
}

export interface CheckoutShop {
  vendorId: number;
  vendorName: string | null;
  subtotal: number;
  /** Cheapest first. Empty when the shop does not ship to the address. */
  options: ShippingOption[];
  chosenRateId: number | null;
  shippingFee: number | null;
}

export interface CheckoutPaymentMethod {
  systemName: string;
  displayName: string;
  isOffline: boolean;
}

/** The cart as priced now, the options for the address and the totals. Every number is the server's. */
export interface CheckoutPreview {
  cart: CartView;
  addressId: number | null;
  shops: CheckoutShop[];
  paymentMethods: CheckoutPaymentMethod[];
  paymentMethod: string | null;
  subtotal: number;
  /** Null while a shipping choice is missing. */
  shippingTotal: number | null;
  total: number | null;
  problems: CheckoutProblem[];
  canPlace: boolean;
}

export interface PlaceOrderRequest extends CheckoutChoices {
  idempotencyKey: string;
  acceptedTerms: boolean;
  note: string | null;
}

export interface PlacedOrder {
  orderId: number;
  number: string;
  currencyCode: string;
  subtotal: number;
  shippingTotal: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string | null;
  /** True when the same key had already made this order. */
  replayed: boolean;
  shopOrders: { id: number; number: string; vendorId: number; shopName: string; total: number }[];
}
