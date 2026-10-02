export interface ProductCardModel {
  id: number;
  name: string;
  category: string;
  price: string;
  compareAtPrice?: string;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  /** Name of the shop selling the product. */
  shopName?: string | null;
  shopId?: number;
  /** True when the product cannot be bought right now. */
  outOfStock?: boolean;
}
