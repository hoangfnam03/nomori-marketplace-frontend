import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { WalletApiService } from '../../core/wallets/wallet-api.service';
import { Wallet, WalletEntry } from '../../core/wallets/wallet.models';
import { paymentMethodName } from '../../core/payments/payment-method-name';

const PAGE_SIZE = 10;
const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

function newKey(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `topup-${random}`.slice(0, 64);
}

/**
 * "Ví của tôi": the balance, topping it up through a gateway page, and every change of it. Refunds of returns and of cancelled paid orders
 * land here; the wallet pays at checkout. Topping up opens in a dialog; withdrawing to a bank account is not wired yet.
 */
@Component({
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  styles: [`
    .balance { font-family: var(--display-font); font-size: 2.25rem; margin: 0; }
    .quick { display: flex; gap: .5rem; flex-wrap: wrap; }
    .quick .btn-secondary.selected { border-color: var(--green); color: var(--green); }
    .methods { display: grid; gap: .4rem; border: 0; padding: 0; margin: 0; }
    .methods legend { font-size: .85rem; font-weight: 500; margin-bottom: .3rem; }
    .method { display: flex; gap: .5rem; align-items: center; cursor: pointer; font-size: .9rem; }
    .amount-in { color: var(--green); font-weight: 600; white-space: nowrap; }
    .amount-out { color: #a84031; font-weight: 600; white-space: nowrap; }
    /* The shared table aligns every header left; the money columns line up on the right, headers included. */
    .history { table-layout: fixed; }
    .history .col-date { width: 11rem; }
    .history .col-money { width: 10rem; }
    .history th.num, .history td.num { text-align: right; white-space: nowrap; }
    .history td { overflow-wrap: anywhere; }
    .wallet-dialog { width: min(460px, calc(100vw - 2rem)); padding: 0; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--ink); }
    .wallet-dialog::backdrop { background: rgba(31,37,32,.45); }
    .dialog-head { display: flex; justify-content: space-between; align-items: center; padding: .85rem 1rem; border-bottom: 1px solid var(--line); }
    .dialog-head h3 { margin: 0; font-size: 1rem; }
    .dialog-close { border: none; background: transparent; color: var(--ink); font-size: 1.4rem; line-height: 1; cursor: pointer; }
    .dialog-body { padding: 1rem; }
  `],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="wallet-title">
      <div class="eyebrow">{{ t('wallet.eyebrow') }}</div>
      <h1 id="wallet-title">{{ t('wallet.title') }}</h1>
      <p>{{ t('wallet.lede') }}</p>
    </section>

    @if (returnedFromTopUp) { <div class="panel"><div class="panel-body"><p class="banner banner-info" role="status">{{ t('wallet.topUp.returned') }}</p></div></div> }

    @if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
      </div></div>
    } @else if (!wallet) {
      <p class="state">{{ t('common.states.loading') }}</p>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('wallet.balance') }}</h2>
          <button type="button" class="btn btn-secondary btn-small" (click)="load()" [disabled]="loading">{{ t('wallet.refresh') }}</button>
        </div>
        <div class="panel-body">
          <p class="balance" aria-live="polite">{{ money(wallet.balance) }}</p>
          <p class="muted">{{ t('wallet.balanceHint') }}</p>
          <div class="actions">
            <button type="button" class="btn" (click)="openTopUp()">{{ t('wallet.topUp.open') }}</button>
            <button type="button" class="btn btn-secondary" disabled>{{ t('wallet.withdraw') }}</button>
          </div>
        </div>
      </div>

      <dialog #topUpDialog class="wallet-dialog" aria-labelledby="topup-title" (click)="closeOnBackdrop($event)">
        <div class="dialog-head">
          <h3 id="topup-title">{{ t('wallet.topUp.title') }}</h3>
          <button type="button" class="dialog-close" (click)="closeTopUp()" [attr.aria-label]="t('wallet.topUp.close')">×</button>
        </div>
        <div class="dialog-body">
          @if (wallet.topUpMethods.length === 0) {
            <p class="muted">{{ t('wallet.topUp.noMethods') }}</p>
          } @else {
            <form class="form" (ngSubmit)="topUp()" novalidate>
              <div class="quick" role="group" [attr.aria-label]="t('wallet.topUp.quick')">
                @for (q of quickAmounts; track q) {
                  <button type="button" class="btn btn-secondary btn-small" [class.selected]="amount === q" (click)="amount = q">{{ money(q) }}</button>
                }
              </div>
              <label>
                {{ t('wallet.topUp.amount') }}
                <input type="number" name="amount" inputmode="numeric" [min]="wallet.minTopUp" [max]="wallet.maxTopUp" step="1000" [(ngModel)]="amount" required />
                <span class="hint">{{ t('wallet.topUp.limits', { min: money(wallet.minTopUp), max: money(wallet.maxTopUp) }) }}</span>
              </label>
              @if (wallet.topUpMethods.length > 1) {
                <fieldset class="methods">
                  <legend>{{ t('wallet.topUp.method') }}</legend>
                  @for (m of wallet.topUpMethods; track m.systemName) {
                    <label class="method">
                      <input type="radio" name="method" [value]="m.systemName" [(ngModel)]="method" />
                      <span>{{ methodName(m.systemName, m.displayName) }}</span>
                    </label>
                  }
                </fieldset>
              }
              @if (topUpError) { <p class="banner" role="alert">{{ topUpError }}</p> }
              <p class="muted">{{ t('wallet.topUp.redirectHint') }}</p>
              <div class="actions">
                <button type="submit" class="btn" [disabled]="busy">{{ busy ? t('wallet.topUp.going') : t('wallet.topUp.submit') }}</button>
                <button type="button" class="btn btn-secondary" (click)="closeTopUp()" [disabled]="busy">{{ t('wallet.topUp.cancel') }}</button>
              </div>
            </form>
          }
        </div>
      </dialog>

      <div class="panel">
        <div class="panel-header"><h2>{{ t('wallet.history.title') }}</h2></div>
        @if (entriesError) {
          <div class="panel-body"><p class="banner" role="alert">{{ entriesError }}</p></div>
        } @else if (entries.length === 0) {
          <p class="state">{{ loading ? t('common.states.loading') : t('wallet.history.empty') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table history">
              <colgroup><col class="col-date" /><col /><col class="col-money" /><col class="col-money" /></colgroup>
              <thead>
                <tr>
                  <th scope="col">{{ t('wallet.history.date') }}</th>
                  <th scope="col">{{ t('wallet.history.what') }}</th>
                  <th scope="col" class="num">{{ t('wallet.history.amount') }}</th>
                  <th scope="col" class="num">{{ t('wallet.history.after') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (e of entries; track e.id) {
                  <tr>
                    <td>{{ e.createdOnUtc | date: 'short' }}</td>
                    <td>
                      {{ t('wallet.kinds.' + e.kind) }}
                      @if (describe(e); as d) { <span class="muted"> · {{ d }}</span> }
                      @if (e.referenceType === 'order' && e.referenceId) { · <a [routerLink]="['/customer/orders', e.referenceId]">{{ t('wallet.history.seeOrder') }}</a> }
                    </td>
                    <td class="num"><span [class.amount-in]="e.amount > 0" [class.amount-out]="e.amount < 0">{{ e.amount > 0 ? '+' : '−' }}{{ money(abs(e.amount)) }}</span></td>
                    <td class="num">{{ money(e.balanceAfter) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <nav class="pagination" [attr.aria-label]="t('common.pagination.label')">
            <button type="button" (click)="goTo(page - 1)" [disabled]="page <= 1 || loading">{{ t('common.pagination.prev') }}</button>
            <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
            <button type="button" (click)="goTo(page + 1)" [disabled]="page >= totalPages || loading">{{ t('common.pagination.next') }}</button>
          </nav>
        }
      </div>
    }
    </ng-container>
  `
})
export class WalletPage implements OnInit {
  private readonly api = inject(WalletApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('topUpDialog') private topUpDialog?: ElementRef<HTMLDialogElement>;

  readonly quickAmounts = QUICK_AMOUNTS;

  wallet: Wallet | null = null;
  entries: WalletEntry[] = [];
  page = 1;
  totalPages = 1;
  loading = false;
  loadError = '';
  entriesError = '';

  amount: number | null = QUICK_AMOUNTS[1];
  method = '';
  busy = false;
  topUpError = '';
  returnedFromTopUp = false;
  private key = newKey();

  ngOnInit() {
    this.currency.load();
    this.returnedFromTopUp = this.route.snapshot.queryParamMap.get('topup') === 'return';
    this.load();
  }

  money(value: number) { return this.currency.formatPrimary(value); }
  abs(value: number) { return Math.abs(value); }
  methodName(systemName: string, serverName: string) { return paymentMethodName(systemName, serverName); }

  /** What caused the change, in words: the return or order number the server kept, or the gateway of a top-up. */
  describe(entry: WalletEntry): string | null {
    if (entry.kind === 'top_up') return paymentMethodName(entry.note, this.wallet?.topUpMethods.find(m => m.systemName === entry.note)?.displayName);
    if (entry.referenceType === 'return') return this.transloco.translate('wallet.history.forReturn', { number: entry.note ?? '' });
    if (entry.referenceType === 'shop_order') return this.transloco.translate('wallet.history.forCancel', { number: entry.note ?? '' });
    return entry.note;
  }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.get().subscribe({
      next: wallet => {
        this.wallet = wallet;
        if (!wallet.topUpMethods.some(m => m.systemName === this.method)) this.method = wallet.topUpMethods[0]?.systemName ?? '';
        this.goTo(this.page);
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('wallet.errors.load')); }
    });
  }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.entriesError = '';
    this.api.entries(this.page, PAGE_SIZE).subscribe({
      next: result => {
        this.entries = result.items;
        this.totalPages = Math.max(result.totalPages, 1);
        this.loading = false;
      },
      error: err => { this.loading = false; this.entriesError = vendorErrorMessage(err, this.transloco.translate('wallet.errors.history')); }
    });
  }

  openTopUp() {
    this.topUpError = '';
    this.topUpDialog?.nativeElement.showModal();
  }

  closeTopUp() {
    if (this.busy) return;
    this.topUpDialog?.nativeElement.close();
  }

  /** A click on the dimmed backdrop (the dialog element itself, outside its content) closes it. */
  closeOnBackdrop(event: MouseEvent) {
    if (event.target === this.topUpDialog?.nativeElement) this.closeTopUp();
  }

  topUp() {
    const wallet = this.wallet;
    if (!wallet || this.busy) return;
    const amount = Number(this.amount);
    this.topUpError = '';
    if (!Number.isInteger(amount) || amount < wallet.minTopUp || amount > wallet.maxTopUp) {
      this.topUpError = this.transloco.translate('wallet.topUp.limits', { min: this.money(wallet.minTopUp), max: this.money(wallet.maxTopUp) });
      return;
    }
    if (!this.method) { this.topUpError = this.transloco.translate('wallet.topUp.chooseMethod'); return; }

    this.busy = true;
    this.api.topUp(amount, this.method, this.key).subscribe({
      next: started => {
        // A new top-up next time; this one is on its way to the gateway.
        this.key = newKey();
        if (started.redirectUrl) { window.location.assign(started.redirectUrl); return; }
        this.busy = false;
        this.topUpError = this.transloco.translate('wallet.errors.topUp');
      },
      error: err => {
        this.busy = false;
        // A refused top-up created nothing usable: the next attempt starts fresh.
        this.key = newKey();
        this.topUpError = vendorErrorMessage(err, this.transloco.translate('wallet.errors.topUp'));
      }
    });
  }
}
