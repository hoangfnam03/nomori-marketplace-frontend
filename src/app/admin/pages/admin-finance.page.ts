import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { FinanceApiService } from '../../core/finance/finance-api.service';
import { BankStatus, CommissionOverview, MAX_COMMISSION_RATE, Page, Payout, PayoutStatus, VendorBalance } from '../../core/finance/finance.models';
import { CurrencyService } from '../../core/money/currency.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

type Tab = 'commission' | 'balances' | 'payouts' | 'adjustments';

/** Platform finance: commission rates, what every shop is owed, payouts to make and confirm, and manual adjustments. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="afin-title">
      <div class="eyebrow">{{ t('finance.admin.eyebrow') }}</div>
      <h1 id="afin-title">{{ t('finance.admin.title') }}</h1>
      <p>{{ t('finance.admin.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <div class="actions" role="tablist">
          @for (item of tabs; track item) {
            <button type="button" role="tab" class="btn btn-small" [class.btn-secondary]="tab !== item" [attr.aria-selected]="tab === item" (click)="open(item)">{{ t('finance.admin.tabs.' + item) }}</button>
          }
        </div>
      </div>
      @if (error) { <div class="panel-body"><p class="banner" role="alert">{{ error }}</p></div> }
      @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }

      @switch (tab) {
        @case ('commission') {
          @if (!commission) {
            <p class="state">{{ t('common.states.loading') }}</p>
          } @else {
            <div class="panel-body">
              <h2>{{ t('finance.admin.defaultRate') }}: {{ commission.defaultRate }}%</h2>
              <form class="form" (ngSubmit)="saveDefault()">
                <div class="form-row">
                  <label>{{ t('finance.admin.newRate') }}
                    <input type="number" min="0" [max]="maxRate" step="0.01" [(ngModel)]="defaultRate" name="defaultRate" required />
                  </label>
                  <label>{{ t('finance.admin.note') }}
                    <input type="text" [(ngModel)]="defaultNote" name="defaultNote" maxlength="500" />
                  </label>
                </div>
                <p class="hint muted">{{ t('finance.admin.rateHint', { max: maxRate }) }}</p>
                <div class="actions"><button type="submit" class="btn" [disabled]="busy">{{ t('finance.admin.saveRate') }}</button></div>
              </form>
            </div>

            <div class="panel-header"><h2>{{ t('finance.admin.shopRates') }}</h2></div>
            <div class="panel-body">
              <form class="form" (ngSubmit)="saveVendorRate()">
                <div class="form-row">
                  <label>{{ t('finance.admin.shopId') }}
                    <input type="number" min="1" step="1" [(ngModel)]="shopId" name="shopId" required />
                  </label>
                  <label>{{ t('finance.admin.newRate') }}
                    <input type="number" min="0" [max]="maxRate" step="0.01" [(ngModel)]="shopRate" name="shopRate" required />
                  </label>
                  <label>{{ t('finance.admin.note') }}
                    <input type="text" [(ngModel)]="shopNote" name="shopNote" maxlength="500" />
                  </label>
                </div>
                <div class="actions"><button type="submit" class="btn" [disabled]="busy">{{ t('finance.admin.saveShopRate') }}</button></div>
              </form>
            </div>
            @if (commission.overrides.length === 0) {
              <p class="state">{{ t('finance.admin.noOverrides') }}</p>
            } @else {
              <div class="table-scroll">
                <table class="data-table">
                  <thead><tr><th>{{ t('finance.admin.shop') }}</th><th>{{ t('finance.admin.rate') }}</th><th>{{ t('finance.admin.note') }}</th><th></th></tr></thead>
                  <tbody>
                    @for (o of commission.overrides; track o.vendorId) {
                      <tr>
                        <td>{{ o.shopName }} (#{{ o.vendorId }})</td><td>{{ o.rate }}%</td><td>{{ o.note ?? '' }}</td>
                        <td><button type="button" class="btn btn-danger btn-small" (click)="removeVendorRate(o.vendorId)" [disabled]="busy">{{ t('finance.admin.removeRate') }}</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="panel-header"><h2>{{ t('finance.admin.history') }}</h2></div>
            @if (commission.history.length === 0) {
              <p class="state">{{ t('finance.admin.noHistory') }}</p>
            } @else {
              <div class="table-scroll">
                <table class="data-table">
                  <thead><tr><th>{{ t('finance.admin.when') }}</th><th>{{ t('finance.admin.scope') }}</th><th>{{ t('finance.admin.oldRate') }}</th><th>{{ t('finance.admin.newRate') }}</th><th>{{ t('finance.admin.note') }}</th></tr></thead>
                  <tbody>
                    @for (h of commission.history; track h.id) {
                      <tr>
                        <td>{{ h.changedOnUtc | date: 'short' }}</td>
                        <td>{{ h.vendorId ? (h.shopName ?? '') + ' (#' + h.vendorId + ')' : t('finance.admin.platformDefault') }}</td>
                        <td>{{ h.oldRate === null ? '—' : h.oldRate + '%' }}</td><td>{{ h.newRate === null ? '—' : h.newRate + '%' }}</td><td>{{ h.note ?? '' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }

        @case ('balances') {
          <div class="panel-body">
            <div class="actions">
              <select [(ngModel)]="bankFilter" name="bankFilter" (ngModelChange)="loadBalances(1)" [attr.aria-label]="t('finance.admin.bankStatus')">
                <option value="">{{ t('finance.admin.allBanks') }}</option>
                @for (b of bankStatuses; track b) { <option [value]="b">{{ t('finance.bankStatus.' + b) }}</option> }
              </select>
              <input type="search" [(ngModel)]="balanceSearch" name="balanceSearch" [placeholder]="t('finance.admin.searchShop')" (keyup.enter)="loadBalances(1)" />
              <button type="button" class="btn btn-secondary btn-small" (click)="loadBalances(1)">{{ t('finance.admin.search') }}</button>
            </div>
          </div>
          @if (loading) {
            <p class="state">{{ t('common.states.loading') }}</p>
          } @else if (!balances || balances.items.length === 0) {
            <p class="state">{{ t('finance.admin.noBalances') }}</p>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>{{ t('finance.admin.shop') }}</th><th>{{ t('finance.admin.available') }}</th><th>{{ t('finance.admin.inPayout') }}</th>
                  <th>{{ t('finance.admin.paid') }}</th><th>{{ t('finance.admin.bankStatus') }}</th>
                </tr></thead>
                <tbody>
                  @for (b of balances.items; track b.vendorId) {
                    <tr>
                      <td>{{ b.shopName }} (#{{ b.vendorId }})</td><td>{{ money(b.available) }}</td><td>{{ money(b.inPayout) }}</td><td>{{ money(b.paid) }}</td>
                      <td>{{ t('finance.bankStatus.' + b.bankStatus) }}@if (b.accountLast4) { <span class="muted"> **** {{ b.accountLast4 }}</span> }</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="panel-body">
              <div class="actions">
                <button type="button" class="btn btn-secondary btn-small" [disabled]="balances.page <= 1" (click)="loadBalances(balances.page - 1)">{{ t('finance.admin.previous') }}</button>
                <span class="muted">{{ balances.page }} / {{ balances.totalPages || 1 }}</span>
                <button type="button" class="btn btn-secondary btn-small" [disabled]="balances.page >= balances.totalPages" (click)="loadBalances(balances.page + 1)">{{ t('finance.admin.next') }}</button>
              </div>
            </div>
          }
        }

        @case ('payouts') {
          <div class="panel-body">
            <form class="form" (ngSubmit)="createPayouts()">
              <div class="form-row">
                <label>{{ t('finance.admin.cutoff') }}
                  <input type="datetime-local" [(ngModel)]="cutoff" name="cutoff" />
                  <span class="hint">{{ t('finance.admin.cutoffHint') }}</span>
                </label>
              </div>
              <div class="actions">
                <button type="submit" class="btn" [disabled]="busy">{{ t('finance.admin.createPayouts') }}</button>
                <a class="btn btn-secondary" [href]="csvUrl" download>{{ t('finance.admin.exportCsv') }}</a>
                <select [(ngModel)]="payoutFilter" name="payoutFilter" (ngModelChange)="loadPayouts(1)" [attr.aria-label]="t('finance.admin.status')">
                  <option value="">{{ t('finance.admin.allStatuses') }}</option>
                  @for (s of payoutStatuses; track s) { <option [value]="s">{{ t('finance.payoutStatus.' + s) }}</option> }
                </select>
              </div>
            </form>
          </div>
          @if (loading) {
            <p class="state">{{ t('common.states.loading') }}</p>
          } @else if (!payouts || payouts.items.length === 0) {
            <p class="state">{{ t('finance.admin.noPayouts') }}</p>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>{{ t('finance.admin.payout') }}</th><th>{{ t('finance.admin.shop') }}</th><th>{{ t('finance.admin.amount') }}</th>
                  <th>{{ t('finance.admin.account') }}</th><th>{{ t('finance.admin.status') }}</th><th></th>
                </tr></thead>
                <tbody>
                  @for (p of payouts.items; track p.id) {
                    <tr>
                      <td>{{ p.number }}<div class="muted">{{ p.createdOnUtc | date: 'short' }} · {{ t('finance.admin.entries', { count: p.entryCount }) }}</div></td>
                      <td>{{ p.shopName }} (#{{ p.vendorId }})</td>
                      <td>{{ money(p.amount) }}</td>
                      <td>{{ p.bankName }} **** {{ p.accountLast4 }}<div class="muted">{{ p.holderName }}</div></td>
                      <td>
                        <span class="badge" [class.badge-active]="p.status === 'paid'" [class.badge-pending]="p.status === 'pending'" [class.badge-rejected]="p.status === 'failed'">{{ t('finance.payoutStatus.' + p.status) }}</span>
                        @if (p.reference) { <div class="muted">{{ p.reference }}</div> }
                        @if (p.failureReason) { <div class="muted">{{ p.failureReason }}</div> }
                        @if (rowErrors[p.id]) { <div class="field-error" role="alert">{{ rowErrors[p.id] }}</div> }
                      </td>
                      <td>
                        @if (p.status === 'pending') {
                          <div class="row-actions">
                            <input type="text" [(ngModel)]="inputs[p.id]" [name]="'input-' + p.id" [placeholder]="t('finance.admin.referenceOrReason')" maxlength="500" style="min-width:12rem" />
                            <button type="button" class="btn btn-small" (click)="markPaid(p)" [disabled]="busy">{{ t('finance.admin.markPaid') }}</button>
                            <button type="button" class="btn btn-danger btn-small" (click)="markFailed(p)" [disabled]="busy">{{ t('finance.admin.markFailed') }}</button>
                          </div>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="panel-body">
              <div class="actions">
                <button type="button" class="btn btn-secondary btn-small" [disabled]="payouts.page <= 1" (click)="loadPayouts(payouts.page - 1)">{{ t('finance.admin.previous') }}</button>
                <span class="muted">{{ payouts.page }} / {{ payouts.totalPages || 1 }}</span>
                <button type="button" class="btn btn-secondary btn-small" [disabled]="payouts.page >= payouts.totalPages" (click)="loadPayouts(payouts.page + 1)">{{ t('finance.admin.next') }}</button>
              </div>
            </div>
          }
        }

        @case ('adjustments') {
          <div class="panel-body">
            <p class="muted">{{ t('finance.admin.adjustHint') }}</p>
            <form class="form" (ngSubmit)="adjust()">
              <div class="form-row">
                <label>{{ t('finance.admin.shopId') }}
                  <input type="number" min="1" step="1" [(ngModel)]="adjShop" name="adjShop" required />
                </label>
                <label>{{ t('finance.admin.adjustAmount') }}
                  <input type="number" step="0.01" [(ngModel)]="adjAmount" name="adjAmount" required />
                </label>
              </div>
              <label>{{ t('finance.admin.reason') }}
                <input type="text" [(ngModel)]="adjReason" name="adjReason" required maxlength="500" />
              </label>
              <div class="actions"><button type="submit" class="btn" [disabled]="busy">{{ t('finance.admin.addAdjustment') }}</button></div>
            </form>
          </div>
        }
      }
    </div>
    </ng-container>
  `
})
export class AdminFinancePage implements OnInit {
  private readonly api = inject(FinanceApiService);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly tabs: Tab[] = ['commission', 'balances', 'payouts', 'adjustments'];
  readonly bankStatuses: BankStatus[] = ['missing', 'hold', 'ready'];
  readonly payoutStatuses: PayoutStatus[] = ['pending', 'paid', 'failed'];
  readonly maxRate = MAX_COMMISSION_RATE;
  readonly csvUrl = this.api.pendingPayoutsCsvUrl();

  tab: Tab = 'commission';
  loading = false;
  busy = false;
  error = '';
  notice = '';

  commission: CommissionOverview | null = null;
  defaultRate: number | null = null;
  defaultNote = '';
  shopId: number | null = null;
  shopRate: number | null = null;
  shopNote = '';

  balances: Page<VendorBalance> | null = null;
  bankFilter: BankStatus | '' = '';
  balanceSearch = '';

  payouts: Page<Payout> | null = null;
  payoutFilter: PayoutStatus | '' = 'pending';
  cutoff = '';
  /** The bank reference or the failure reason being typed, per payout. */
  inputs: Record<number, string> = {};
  rowErrors: Record<number, string> = {};

  adjShop: number | null = null;
  adjAmount: number | null = null;
  adjReason = '';

  ngOnInit() {
    this.currency.load();
    this.loadCommission();
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  open(tab: Tab) {
    this.tab = tab;
    this.error = '';
    this.notice = '';
    if (tab === 'commission') this.loadCommission();
    if (tab === 'balances') this.loadBalances(1);
    if (tab === 'payouts') this.loadPayouts(1);
  }

  loadCommission() {
    this.api.commission().subscribe({
      next: result => { this.commission = result; this.defaultRate = result.defaultRate; },
      error: err => this.fail(err, 'finance.admin.errors.load')
    });
  }

  saveDefault() {
    if (this.defaultRate === null) return;
    this.run(this.api.setDefaultRate(this.defaultRate, this.defaultNote.trim()), 'finance.admin.saved', () => { this.defaultNote = ''; this.loadCommission(); });
  }

  saveVendorRate() {
    if (this.shopId === null || this.shopRate === null) return;
    this.run(this.api.setVendorRate(this.shopId, this.shopRate, this.shopNote.trim()), 'finance.admin.saved', () => {
      this.shopId = null; this.shopRate = null; this.shopNote = ''; this.loadCommission();
    });
  }

  removeVendorRate(vendorId: number) {
    this.run(this.api.removeVendorRate(vendorId), 'finance.admin.saved', () => this.loadCommission());
  }

  loadBalances(page: number) {
    this.loading = true;
    this.api.balances(this.bankFilter, this.balanceSearch, page, 20).subscribe({
      next: result => { this.balances = result; this.loading = false; },
      error: err => { this.loading = false; this.fail(err, 'finance.admin.errors.load'); }
    });
  }

  loadPayouts(page: number) {
    this.loading = true;
    this.api.adminPayouts(this.payoutFilter, page, 20).subscribe({
      next: result => { this.payouts = result; this.loading = false; },
      error: err => { this.loading = false; this.fail(err, 'finance.admin.errors.load'); }
    });
  }

  createPayouts() {
    this.error = '';
    this.notice = '';
    this.busy = true;
    // The field has no time zone: it is read as the browser's local time and sent as an instant.
    const cutoffUtc = this.cutoff ? new Date(this.cutoff).toISOString() : null;
    this.api.createPayouts(cutoffUtc).subscribe({
      next: result => {
        this.busy = false;
        this.notice = this.transloco.translate('finance.admin.payoutsCreated', { created: result.created.length, skipped: result.skipped });
        this.loadPayouts(1);
      },
      error: err => { this.busy = false; this.fail(err, 'finance.admin.errors.action'); }
    });
  }

  markPaid(payout: Payout) {
    this.resolve(payout, this.api.markPaid(payout.id, (this.inputs[payout.id] ?? '').trim()));
  }

  markFailed(payout: Payout) {
    this.resolve(payout, this.api.markFailed(payout.id, (this.inputs[payout.id] ?? '').trim()));
  }

  adjust() {
    if (this.adjShop === null || this.adjAmount === null) return;
    this.run(this.api.adjust(this.adjShop, this.adjAmount, this.adjReason.trim()), 'finance.admin.adjusted', () => {
      this.adjShop = null; this.adjAmount = null; this.adjReason = '';
    });
  }

  private resolve(payout: Payout, request: Observable<unknown>) {
    this.busy = true;
    this.rowErrors = { ...this.rowErrors, [payout.id]: '' };
    request.subscribe({
      next: () => { this.busy = false; this.inputs[payout.id] = ''; this.loadPayouts(this.payouts?.page ?? 1); },
      error: err => {
        this.busy = false;
        this.rowErrors = { ...this.rowErrors, [payout.id]: vendorErrorMessage(err, this.transloco.translate('finance.admin.errors.action')) };
        // Someone else may have decided it already: show it as it is now.
        if (err?.status === 409) this.loadPayouts(this.payouts?.page ?? 1);
      }
    });
  }

  private run(request: Observable<unknown>, noticeKey: string, done: () => void) {
    this.error = '';
    this.notice = '';
    this.busy = true;
    request.subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate(noticeKey); done(); },
      error: err => { this.busy = false; this.fail(err, 'finance.admin.errors.action'); }
    });
  }

  private fail(err: Parameters<typeof vendorErrorMessage>[0], key: string) {
    this.error = vendorErrorMessage(err, this.transloco.translate(key));
  }
}
