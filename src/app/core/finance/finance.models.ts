export type EntryKind = 'sale' | 'refund' | 'adjustment';
export type PayoutStatus = 'pending' | 'paid' | 'failed';
/** `missing` has no account, `hold` is waiting out the safety period, `ready` can be paid. */
export type BankStatus = 'missing' | 'hold' | 'ready';

export interface MonthlyTotal { month: string; sales: number; commission: number; refunds: number; }

export interface FinanceOverview {
  rate: number;
  pending: number;
  available: number;
  inPayout: number;
  paid: number;
  currencyCode: string;
  minimumPayout: number;
  bankStatus: BankStatus;
  months: MonthlyTotal[];
}

export interface LedgerEntry {
  id: number;
  vendorId: number;
  kind: EntryKind;
  shopOrderId: number | null;
  shopOrderNumber: string | null;
  returnRequestId: number | null;
  gross: number;
  commission: number;
  amount: number;
  currencyCode: string;
  note: string | null;
  payoutId: number | null;
  createdOnUtc: string;
}

export interface Page<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }

export interface Payout {
  id: number;
  number: string;
  vendorId: number;
  shopName: string;
  status: PayoutStatus;
  amount: number;
  currencyCode: string;
  entryCount: number;
  cutoffUtc: string;
  bankName: string;
  accountLast4: string;
  holderName: string;
  branch: string | null;
  reference: string | null;
  failureReason: string | null;
  createdOnUtc: string;
  updatedOnUtc: string;
}

export interface PayoutDetail { payout: Payout; entries: LedgerEntry[]; }
export interface PayoutRun { created: Payout[]; skipped: number; }

export interface BankAccountView {
  bankName: string;
  maskedNumber: string;
  holderName: string;
  branch: string | null;
  updatedOnUtc: string;
  usableFromUtc: string;
  usable: boolean;
}

export interface SaveBankAccount {
  bankName: string;
  accountNumber: string;
  holderName: string;
  branch: string | null;
  password: string;
}

export interface VendorCommission { vendorId: number; shopName: string; rate: number; note: string | null; updatedOnUtc: string; }
export interface CommissionChange {
  id: number; vendorId: number | null; shopName: string | null; oldRate: number | null; newRate: number | null;
  note: string | null; changedByCustomerId: number; changedOnUtc: string;
}
export interface CommissionOverview { defaultRate: number; overrides: VendorCommission[]; history: CommissionChange[]; }

export interface VendorBalance {
  vendorId: number; shopName: string; available: number; inPayout: number; paid: number;
  bankStatus: BankStatus; accountLast4: string | null; currencyCode: string;
}

export const MAX_COMMISSION_RATE = 50;
