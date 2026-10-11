export interface DailySales { day: string; orders: number; sales: number; }

export interface ShopSummary {
  orders: number;
  units: number;
  sales: number;
  shipping: number;
  cancelledOrders: number;
  returnsOpened: number;
  refundedAmount: number;
}

export interface TopProduct { productId: number; name: string; units: number; revenue: number; }
export interface LowStockProduct { productId: number; name: string; sku: string | null; stockQuantity: number; lowStockThreshold: number; }

export interface ShopDashboard {
  currencyCode: string;
  fromUtc: string;
  toUtc: string;
  summary: ShopSummary;
  averageOrderValue: number;
  daily: DailySales[];
  topProducts: TopProduct[];
  ordersByStatus: Record<string, number>;
  lowStock: LowStockProduct[];
}

export interface PlatformSummary {
  orders: number;
  merchandise: number;
  newCustomers: number;
  activeShops: number;
  commission: number;
  refundedAmount: number;
  cancelledOrders: number;
}

export interface TopShop { vendorId: number; shopName: string; orders: number; sales: number; }

export interface PlatformDashboard {
  currencyCode: string;
  fromUtc: string;
  toUtc: string;
  summary: PlatformSummary;
  averageOrderValue: number;
  daily: DailySales[];
  topShops: TopShop[];
}

/** What needs a person's attention right now. */
export interface Operations {
  pendingPayouts: number;
  pendingPayoutAmount: number;
  openReturns: number;
  unconfirmedShopOrders: number;
  failedJobs: number;
  failedEmails: number;
  unrecordedSales: number;
  unrecordedRefunds: number;
  lowStockProducts: number;
}

/** `difference` must be 0; anything else is a defect to investigate. */
export interface Reconciliation {
  currencyCode: string;
  fromUtc: string;
  toUtc: string;
  saleLines: number;
  items: number;
  shopFundedDiscount: number;
  platformFundedDiscount: number;
  shipping: number;
  tax: number;
  customerPaid: number;
  shopRevenue: number;
  commission: number;
  difference: number;
  refundLines: number;
  refundedFromShops: number;
  commissionReturned: number;
  payoutMismatches: number;
}

export const ORDER_STATUS_ORDER = ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'];
