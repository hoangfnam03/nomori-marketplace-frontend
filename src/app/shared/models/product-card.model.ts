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
}
