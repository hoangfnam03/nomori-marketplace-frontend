export type DiscountType = 'percentage' | 'fixed';
export type DiscountFunding = 'platform' | 'shop';

/** Why a code does not apply to a cart. */
export type CouponReason =
  | 'not_found' | 'disabled' | 'not_started' | 'expired' | 'min_subtotal'
  | 'limit_reached' | 'customer_limit_reached' | 'nothing_to_discount';

export interface Discount {
  id: number;
  name: string;
  code: string;
  type: DiscountType;
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
  value: number;
  maxDiscountAmount: number | null;
  startsOnUtc: string | null;
  endsOnUtc: string | null;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  enabled: boolean;
}
