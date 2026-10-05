import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL } from '../core/config/api-config';
import { CurrencyService } from '../core/money/currency.service';
import { vendorErrorMessage } from '../core/vendors/vendor-errors';

interface SandboxPayment {
  amount: number;
  currencyCode: string;
  status: string;
  returnUrl: string;
}

interface SandboxResult {
  callbackOutcome: string;
  status: string;
  returnUrl: string;
}

/**
 * The payment page of the test gateway. A real gateway has a page like this on its own site: the customer pays or fails there, and the
 * gateway reports the result to the shop. Here the buttons ask the test gateway (the API) to send that report, then the customer goes back.
 * It only works where the test gateway is configured; elsewhere the API answers "not found".
 */
@Component({
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <main class="gateway">
      <p class="tag">{{ t('payments.sandbox.tag') }}</p>
      <h1>{{ t('payments.sandbox.title') }}</h1>

      @if (loading) {
        <p class="muted">{{ t('common.states.loading') }}</p>
      } @else if (notFound) {
        <p role="alert">{{ t('payments.sandbox.notFound') }}</p>
      } @else if (loadError) {
        <p class="error" role="alert">{{ loadError }}</p>
        <button type="button" (click)="load()">{{ t('common.actions.retry') }}</button>
      } @else if (payment) {
        <p class="amount">{{ money(payment.amount) }}</p>
        @if (payment.status !== 'pending') {
          <p role="status">{{ t('payments.sandbox.alreadyDone', { status: t('payments.sandbox.status.' + payment.status) }) }}</p>
          <button type="button" class="primary" (click)="back(payment.returnUrl)">{{ t('payments.sandbox.back') }}</button>
        } @else {
          <p class="muted">{{ t('payments.sandbox.hint') }}</p>
          @if (error) { <p class="error" role="alert">{{ error }}</p> }
          <div class="actions">
            <button type="button" class="primary" (click)="complete('paid')" [disabled]="busy">{{ t('payments.sandbox.pay') }}</button>
            <button type="button" class="danger" (click)="complete('failed')" [disabled]="busy">{{ t('payments.sandbox.fail') }}</button>
            <button type="button" (click)="back(payment.returnUrl)" [disabled]="busy">{{ t('payments.sandbox.leave') }}</button>
          </div>
        }
      }
    </main>
    </ng-container>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--paper, #f6f4ee); }
    .gateway { max-width: 420px; margin: 0 auto; padding: 4rem 1.5rem; display: grid; gap: 1rem; }
    .tag { margin: 0; font: 700 .7rem var(--mono-font, monospace); letter-spacing: .12em; text-transform: uppercase; color: #8a5a00; }
    h1 { margin: 0; font: 700 1.6rem var(--display-font, inherit); }
    .amount { margin: 0; font-size: 2.2rem; font-weight: 700; }
    .muted { color: var(--muted, #666); font-size: .9rem; line-height: 1.5; }
    .error { color: #8d3128; }
    .actions { display: grid; gap: .6rem; }
    button { border: 1px solid var(--ink, #111); padding: .8rem 1rem; background: transparent; color: var(--ink, #111); font: 700 .9rem inherit; cursor: pointer; }
    button:disabled { opacity: .4; cursor: not-allowed; }
    .primary { background: var(--ink, #111); color: var(--paper, #fff); }
    .danger { border-color: #8d3128; color: #8d3128; }
  `]
})
export class SandboxGatewayPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);
  private readonly base = `${inject(API_BASE_URL)}/v1/payments/sandbox`;

  payment: SandboxPayment | null = null;
  loading = true;
  notFound = false;
  loadError = '';
  error = '';
  busy = false;

  private reference = '';

  ngOnInit() {
    this.currency.load();
    this.reference = this.route.snapshot.paramMap.get('reference') ?? '';
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  load() {
    this.loading = true;
    this.notFound = false;
    this.loadError = '';
    this.http.get<SandboxPayment>(`${this.base}/${encodeURIComponent(this.reference)}`).subscribe({
      next: payment => { this.payment = payment; this.loading = false; },
      error: err => {
        this.loading = false;
        if (err?.status === 404) this.notFound = true;
        else this.loadError = vendorErrorMessage(err, this.transloco.translate('payments.sandbox.errors.load'));
      }
    });
  }

  complete(outcome: 'paid' | 'failed') {
    this.busy = true;
    this.error = '';
    this.http.post<SandboxResult>(`${this.base}/${encodeURIComponent(this.reference)}/complete`, { outcome }).subscribe({
      next: result => { this.busy = false; this.back(result.returnUrl); },
      error: err => { this.busy = false; this.error = vendorErrorMessage(err, this.transloco.translate('payments.sandbox.errors.complete')); }
    });
  }

  /** Back to the shop, to the order that was being paid. */
  back(returnUrl: string) { window.location.assign(returnUrl); }
}
