export type DiscountType = 'percentage' | 'fixed';
export type DiscountFunding = 'platform' | 'shop';
/** What a code takes off: the items or the shipping. An order can use one code of each kind. */
export type DiscountKind = 'product' | 'shipping';

/** Why a code does not apply to a cart. */
export type CouponReason =
  | 'not_found' | 'disabled' | 'not_started' | 'expired' | 'min_subtotal'
  | 'limit_reached' | 'customer_limit_reached' | 'nothing_to_discount'
  /** A shipping code typed where an item code goes, or the other way round. */
  | 'wrong_kind';

export interface Discount {
  id: number;
  name: string;
  code: string;
  type: DiscountType;
  kind: DiscountKind;
  /** A percentage (0 to 100) or an amount in the primary currency, by type. */
  value: number;
  maxDiscountAmount: number | null;
  startsOnUtc: string | null;
  endsOnUtc: string | null;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  enabled: boolean;
  funding: DiscountFunding;
  createdOnUtc: string;
}

/** Funding and the shop come from the route, never from the body. */
export interface SaveDiscountRequest {
  name: string;
  code: string;
  type: DiscountType;
  kind: DiscountKind;
  value: number;
  maxDiscountAmount: number | null;
  startsOnUtc: string | null;
  endsOnUtc: string | null;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  enabled: boolean;
}
