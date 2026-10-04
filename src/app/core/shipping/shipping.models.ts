/** A flat shipping fee of one shop for a country, or for one state of it. */
export interface ShippingRate {
  id: number;
  name: string;
  countryCode: string;
  /** When set the rate covers only this state; otherwise the whole country. */
  stateProvinceId: number | null;
  fee: number;
  /** When the shop's subtotal reaches this amount the fee is 0. */
  freeOverSubtotal: number | null;
  minDays: number | null;
  maxDays: number | null;
  published: boolean;
  displayOrder: number;
}

export type SaveShippingRateRequest = Omit<ShippingRate, 'id'>;

/** The customer names one of their saved addresses, or a country (and state) for an estimate. */
export interface ShippingQuoteRequest {
  addressId?: number | null;
  countryCode?: string | null;
  stateProvinceId?: number | null;
}

export interface ShippingOption {
  rateId: number;
  name: string;
  fee: number;
  isFree: boolean;
  minDays: number | null;
  maxDays: number | null;
}

export interface ShippingShopQuote {
  vendorId: number;
  vendorName: string | null;
  subtotal: number;
  /** Cheapest first. Empty when the shop does not ship to the destination. */
  options: ShippingOption[];
  canShip: boolean;
}

/** Shipping options per shop of the cart. Amounts are in the primary currency. */
export interface ShippingQuote {
  currencyCode: string;
  countryCode: string;
  stateProvinceId: number | null;
  shops: ShippingShopQuote[];
  canShipAll: boolean;
  /** Sum of the cheapest option of every shop; null when some shop cannot ship. A preview: the customer chooses at checkout. */
  shippingTotal: number | null;
}
