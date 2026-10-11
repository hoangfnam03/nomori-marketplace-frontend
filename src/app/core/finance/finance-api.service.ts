import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import {
  BankAccountView, BankStatus, CommissionOverview, EntryKind, FinanceOverview, LedgerEntry, MonthlyTotal, Page, Payout, PayoutDetail,
  PayoutRun, PayoutStatus, SaveBankAccount, VendorBalance
} from './finance.models';

/** Money of the shops: the shop's own view, and the platform's (commission, balances, payouts). The server decides who may see what. */
@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${inject(API_BASE_URL)}/v1`;

  // ---- Shop ----
  overview(vendorId: number) { return this.http.get<FinanceOverview>(`${this.root}/vendors/${vendorId}/finance`); }

  ledger(vendorId: number, kind: EntryKind | '', search: string, page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (kind) params = params.set('kind', kind);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<Page<LedgerEntry>>(`${this.root}/vendors/${vendorId}/finance/ledger`, { params });
  }

  payouts(vendorId: number, page: number, pageSize: number) {
    return this.http.get<Page<Payout>>(`${this.root}/vendors/${vendorId}/finance/payouts`, { params: new HttpParams().set('page', page).set('pageSize', pageSize) });
  }

  payoutCsvUrl(vendorId: number, payoutId: number) { return `${this.root}/vendors/${vendorId}/finance/payouts/${payoutId}/csv`; }

  bankAccount(vendorId: number) { return this.http.get<BankAccountView | null>(`${this.root}/vendors/${vendorId}/finance/bank-account`); }
  saveBankAccount(vendorId: number, body: SaveBankAccount) { return this.http.put<BankAccountView>(`${this.root}/vendors/${vendorId}/finance/bank-account`, body); }
  banks() { return this.http.get<string[]>(`${this.root}/finance/banks`); }

  // ---- Administrator (permission finance.manage) ----
  commission() { return this.http.get<CommissionOverview>(`${this.root}/admin/finance/commission`); }
  setDefaultRate(rate: number, note: string) { return this.http.put<{ defaultRate: number }>(`${this.root}/admin/finance/commission/default`, { rate, note: note || null }); }
  setVendorRate(vendorId: number, rate: number, note: string) { return this.http.put<{ rate: number }>(`${this.root}/admin/finance/commission/vendors/${vendorId}`, { rate, note: note || null }); }
  removeVendorRate(vendorId: number) { return this.http.delete<{ rate: number | null }>(`${this.root}/admin/finance/commission/vendors/${vendorId}`); }

  balances(bank: BankStatus | '', search: string, page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (bank) params = params.set('bank', bank);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<Page<VendorBalance>>(`${this.root}/admin/finance/balances`, { params });
  }

  monthly(months = 12) { return this.http.get<MonthlyTotal[]>(`${this.root}/admin/finance/monthly`, { params: new HttpParams().set('months', months) }); }
  adjust(vendorId: number, amount: number, reason: string) { return this.http.post<LedgerEntry>(`${this.root}/admin/finance/adjustments`, { vendorId, amount, reason }); }

  createPayouts(cutoffUtc: string | null) { return this.http.post<PayoutRun>(`${this.root}/admin/finance/payouts`, { cutoffUtc }); }

  adminPayouts(status: PayoutStatus | '', page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<Page<Payout>>(`${this.root}/admin/finance/payouts`, { params });
  }

  adminPayout(id: number) { return this.http.get<PayoutDetail>(`${this.root}/admin/finance/payouts/${id}`); }
  markPaid(id: number, reference: string) { return this.http.post<Payout>(`${this.root}/admin/finance/payouts/${id}/paid`, { reference }); }
  markFailed(id: number, reason: string) { return this.http.post<Payout>(`${this.root}/admin/finance/payouts/${id}/failed`, { reason }); }
  pendingPayoutsCsvUrl() { return `${this.root}/admin/finance/payouts/export.csv`; }
}
