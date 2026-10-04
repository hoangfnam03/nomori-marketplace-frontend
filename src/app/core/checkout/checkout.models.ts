import { CartView } from '../cart/cart.models';
import { CouponReason, DiscountFunding } from '../discounts/discount.models';
import { ShippingOption } from '../shipping/shipping.models';

/** What can be wrong with the cart or the choices at checkout. The server gives a stable code for each. */
export type CheckoutProblem =
  | 'cart_empty' | 'cart_issues' | 'prices_changed'
  | 'address_required' | 'address_invalid'
  | 'shipping_unavailable' | 'shipping_not_chosen' | 'shipping_invalid'
  | 'payment_required' | 'payment_invalid' | 'coupon_invalid';

export interface ShippingChoice {
  vendorId: number;
  rateId: number;
}

export interface CheckoutChoices {
  addressId: number | null;
  shippingChoices: ShippingChoice[];
  paymentMethod: string | null;
  /** The code the customer typed, if any. */
  couponCode: string | null;
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

/** What a code gives: who funds it, how much, and how it falls on each shop of the cart (vendor id to amount). */
export interface CheckoutDiscount {
  code: string;
  name: string;
  funding: DiscountFunding;
  amount: number;
  split: Record<number, number>;
}

/** The tax of the cart for the chosen address: in all, and per shop (vendor id to tax). Prices are before tax. */
export interface CheckoutTax {
  total: number;
  perShop: Record<number, number>;
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
  discount: CheckoutDiscount | null;
  /** Why the typed code gives nothing; null when it works or none was typed. */
  couponReason: CouponReason | null;
  /** Null until there is an address: the tax follows the delivery address. */
  tax: CheckoutTax | null;
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
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string | null;
  /** True when the same key had already made this order. */
  replayed: boolean;
  shopOrders: { id: number; number: string; vendorId: number; shopName: string; total: number }[];
}
