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

const STORAGE_KEY = 'nomori.currency';

/** Shown until the list has loaded, and on the server render. */
const FALLBACK: Currency = {
  id: 0, code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, rate: 1,
  isPrimary: true, published: true, displayOrder: 0, rateUpdatedOnUtc: ''
};

/** Rounds half away from zero, like the API does (2.5 becomes 3, -2.5 becomes -3). */
export function roundMoney(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Money for the screens. Every stored amount is in the primary currency. Customers may browse in another published currency:
 * that is a display-only approximation (marked with "≈"). Sellers and administrators always see the primary currency.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/currencies`;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly currencies = signal<Currency[]>([FALLBACK]);
  private readonly selectedCode = signal<string | null>(this.readChoice());
  private loaded = false;

  readonly primary = computed(() => this.currencies().find(c => c.isPrimary) ?? this.currencies()[0] ?? FALLBACK);

  /** What the customer sees: the chosen currency if it is still published, otherwise the primary one. */
  readonly display = computed(() => this.currencies().find(c => c.code === this.selectedCode()) ?? this.primary());

  readonly isConverted = computed(() => this.display().code !== this.primary().code);

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

  select(code: string) {
    this.selectedCode.set(code);
    this.writeChoice(code);
  }

  /** A stored (primary currency) amount in the customer's display currency, with "≈" when it was converted. */
  format(amount: number): string {
    const primary = this.primary();
    const display = this.display();
    if (display.code === primary.code) return this.formatIn(amount, primary);
    const converted = roundMoney(amount / primary.rate * display.rate, display.decimalPlaces);
    return `≈ ${this.formatIn(converted, display)}`;
  }

  /** A stored amount in the primary currency, for sellers and administrators. */
  formatPrimary(amount: number): string {
    return this.formatIn(amount, this.primary());
  }

  private formatIn(amount: number, currency: Currency): string {
    const digits = currency.decimalPlaces;
    const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
    return `${currency.symbol || `${currency.code} `}${number}`;
  }

  private readChoice(): string | null {
    if (!this.browser) return null;
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  private writeChoice(code: string) {
    if (!this.browser) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* the choice just is not remembered */ }
  }
}
