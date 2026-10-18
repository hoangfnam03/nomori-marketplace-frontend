import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { API_BASE_URL } from '../config/api-config';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  /** Units of this currency for one unit of the primary currency; 1 for the primary. */
  rate: number;
  isPrimary: boolean;
  published: boolean;
  displayOrder: number;
  rateUpdatedOnUtc: string;
}

/** Shown until the list has loaded, and on the server render. The marketplace sells in Vietnamese dong. */
const FALLBACK: Currency = {
  id: 0, code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', decimalPlaces: 0, rate: 1,
  isPrimary: true, published: true, displayOrder: 0, rateUpdatedOnUtc: ''
};

/** Money for the screens. Every stored amount is in the primary currency (VND), and everyone sees it in that currency. */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/currencies`;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly currencies = signal<Currency[]>([FALLBACK]);
  private loaded = false;

  readonly primary = computed(() => this.currencies().find(c => c.isPrimary) ?? this.currencies()[0] ?? FALLBACK);

  /** The step of a price input in the primary currency, for example 0.01 or 1. */
  readonly step = computed(() => 1 / 10 ** this.primary().decimalPlaces);

  /** Loads the published currencies once; only in the browser, because the server render has no API address. */
  load() {
    if (this.loaded || !this.browser) return;
    this.loaded = true;
    this.http.get<Currency[]>(this.base).subscribe({
      next: list => { if (list.length > 0) this.currencies.set(list); },
      error: () => { this.loaded = false; }
    });
  }

  /** Fetches the list again, for example after an administrator changed a rate. */
  reload() {
    this.loaded = false;
    this.load();
  }

  /** A stored amount, in the primary currency. */
  format(amount: number): string {
    return this.formatIn(amount, this.primary());
  }

  /** The same as `format`; kept for the seller and administrator screens that call it. */
  formatPrimary(amount: number): string {
    return this.formatIn(amount, this.primary());
  }

  private formatIn(amount: number, currency: Currency): string {
    const digits = currency.decimalPlaces;
    // Dong is written the Vietnamese way: dots between thousands and the symbol after (1.475.000 ₫); other currencies as before ($59.00).
    if (currency.code === 'VND') {
      const number = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
      return `${number} ${currency.symbol || 'đ'}`;
    }
    const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
    return `${currency.symbol || `${currency.code} `}${number}`;
  }
}
