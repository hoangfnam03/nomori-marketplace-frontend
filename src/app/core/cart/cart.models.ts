/** What can be wrong with a cart line. All but price_changed block checkout. */
export type CartIssue = 'unavailable' | 'variant_unavailable' | 'out_of_stock' | 'insufficient_stock' | 'price_changed';

export interface CartLine {
  id: number;
  productId: number;
  name: string;
  vendorId: number;
  vendorName: string | null;
  /** Media asset id of the main picture; 0 when none. */
  mainPictureId: number;
  /** For example "Red / S"; null for a plain product. */
  variantLabel: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  /** The price to strike through, when there is one. */
  comparePrice: number | null;
  lineTotal: number;
  appliedRule: 'base' | 'special' | 'tier' | 'variant_override' | null;
  /** What can still be bought; null when the product does not track stock. */
  availableQuantity: number | null;
  /** The unit price the customer saw earlier, only when it differs from unitPrice. */
  previousUnitPrice: number | null;
  issues: CartIssue[];
}

export interface CartShopGroup {
  vendorId: number;
  vendorName: string | null;
  lines: CartLine[];
  subtotal: number;
}

/** The cart as the server prices it. All amounts are in the primary currency: they are what the customer will pay. */
export interface CartView {
  currencyCode: string;
  groups: CartShopGroup[];
  subtotal: number;
  itemCount: number;
  canCheckout: boolean;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
  valueIds: number[];
}
