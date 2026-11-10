import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Wallet, WalletEntryPage, WalletTopUp } from './wallet.models';

/** The signed-in customer's own wallet. The customer always comes from the session. */
@Injectable({ providedIn: 'root' })
export class WalletApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/wallet`;

  get() { return this.http.get<Wallet>(this.base); }

  entries(page: number, pageSize: number) {
    return this.http.get<WalletEntryPage>(`${this.base}/entries`, { params: new HttpParams().set('page', page).set('pageSize', pageSize) });
  }

  /** Starts a top-up; the answer carries the gateway page to send the customer to. The same key is the same top-up. */
  topUp(amount: number, method: string, idempotencyKey: string) {
    return this.http.post<WalletTopUp>(`${this.base}/topups`, { amount, method, idempotencyKey });
  }
}
