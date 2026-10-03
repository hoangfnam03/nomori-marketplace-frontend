import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Currency } from './currency.service';

export interface SaveCurrencyRequest {
  /** Only used when creating; a code never changes. */
  code?: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  rate: number;
  published: boolean;
  displayOrder: number;
}

/** Administrator routes for currencies (permission settings.manage). */
@Injectable({ providedIn: 'root' })
export class CurrencyAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/admin/currencies`;

  list() { return this.http.get<Currency[]>(this.base); }
  create(body: SaveCurrencyRequest) { return this.http.post<Currency>(this.base, body); }
  update(id: number, body: SaveCurrencyRequest) { return this.http.put<Currency>(`${this.base}/${id}`, body); }
  delete(id: number) { return this.http.delete<void>(`${this.base}/${id}`); }

  /** Makes the currency primary and re-bases the other rates. Refused once products exist. */
  makePrimary(id: number) { return this.http.post<Currency>(`${this.base}/${id}/make-primary`, {}); }
}
