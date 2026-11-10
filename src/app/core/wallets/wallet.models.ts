export type WalletEntryKind = 'top_up' | 'payment' | 'refund' | 'withdrawal' | 'adjustment';

/** A gateway with its own payment page: the only kind a top-up can go through. */
export interface WalletTopUpMethod {
  systemName: string;
  displayName: string;
}

/** The signed-in customer's wallet. The balance never goes below zero. */
export interface Wallet {
  balance: number;
  currencyCode: string;
  topUpMethods: WalletTopUpMethod[];
  minTopUp: number;
  maxTopUp: number;
}

/** One change of the balance: positive adds money, negative takes it. */
export interface WalletEntry {
  id: number;
  kind: WalletEntryKind;
  amount: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  note: string | null;
  createdOnUtc: string;
}

export interface WalletEntryPage {
  items: WalletEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WalletTopUp {
  paymentId: number;
  amount: number;
  redirectUrl: string | null;
}

/** The payment method that pays from the wallet at checkout. */
export const WALLET_METHOD = 'wallet';
