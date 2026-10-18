/** One way a shop's parcel can go: GHN, priced by GHN for the address (or the fallback fee when GHN cannot price it). */
export interface ShippingOption {
  rateId: number;
  name: string;
  /** What the customer pays; 0 when the shop offers free shipping. */
  fee: number;
  isFree: boolean;
  minDays: number | null;
  maxDays: number | null;
  /** GHN's expected delivery days (UTC); null when GHN gave none. */
  estimatedFromUtc?: string | null;
  estimatedToUtc?: string | null;
}
