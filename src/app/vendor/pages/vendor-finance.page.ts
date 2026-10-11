import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { FinanceApiService } from '../../core/finance/finance-api.service';
import { BankAccountView, EntryKind, FinanceOverview, LedgerEntry, Page, Payout } from '../../core/finance/finance.models';
import { CurrencyService } from '../../core/money/currency.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

type Tab = 'overview' | 'ledger' | 'payouts' | 'bank';

/** What a shop is owed: balances, the ledger, payouts and the account the money goes to. Only members of the shop get here. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="finance-title">
      <div class="eyebrow">{{ t('finance.vendor.eyebrow') }}</div>
      <h1 id="finance-title">{{ t('finance.vendor.title') }}</h1>
      <p>{{ t('finance.vendor.lede') }}</p>
    </section>

    @if (!vendorId && !loadingSession) {
      <div class="panel"><p class="state">{{ t('finance.vendor.noShop') }}</p></div>
    } @else {
      <div class="panel">
        <div class="panel-header">
          <div class="actions" role="tablist">
            @for (item of tabs; track item) {
              <button type="button" role="tab" class="btn btn-small" [class.btn-secondary]="tab !== item" [attr.aria-selected]="tab === item" (click)="open(item)">{{ t('finance.vendor.tabs.' + item) }}</button>
            }
          </div>
        </div>

        @if (loadError) {
          <div class="panel-body"><p class="banner" role="alert">{{ loadError }}</p></div>
        }

        @switch (tab) {
          @case ('overview') {
            @if (!overview) {
              <p class="state">{{ t('common.states.loading') }}</p>
            } @else {
              <div class="panel-body">
                @if (overview.bankStatus === 'missing') { <p class="banner" role="status">{{ t('finance.vendor.noBank') }}</p> }
                @else if (overview.bankStatus === 'hold') { <p class="banner banner-info" role="status">{{ t('finance.vendor.bankHold') }}</p> }
                <div class="table-scroll">
                  <table class="data-table">
                    <tbody>
                      <tr><th scope="row">{{ t('finance.vendor.rate') }}</th><td>{{ overview.rate }}%</td></tr>
                      <tr><th scope="row">{{ t('finance.vendor.pending') }}</th><td>{{ money(overview.pending) }}<div class="muted">{{ t('finance.vendor.pendingHint') }}</div></td></tr>
                      <tr><th scope="row">{{ t('finance.vendor.available') }}</th><td><strong>{{ money(overview.available) }}</strong><div class="muted">{{ t('finance.vendor.availableHint', { minimum: money(overview.minimumPayout) }) }}</div></td></tr>
                      <tr><th scope="row">{{ t('finance.vendor.inPayout') }}</th><td>{{ money(overview.inPayout) }}</td></tr>
                      <tr><th scope="row">{{ t('finance.vendor.paid') }}</th><td>{{ money(overview.paid) }}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="panel-header"><h2>{{ t('finance.vendor.months') }}</h2></div>
              @if (overview.months.length === 0) {
                <p class="state">{{ t('finance.vendor.noMonths') }}</p>
              } @else {
                <div class="table-scroll">
                  <table class="data-table">
                    <thead><tr><th>{{ t('finance.vendor.month') }}</th><th>{{ t('finance.vendor.sales') }}</th><th>{{ t('finance.vendor.commission') }}</th><th>{{ t('finance.vendor.refunds') }}</th></tr></thead>
                    <tbody>
                      @for (m of overview.months; track m.month) {
                        <tr><td>{{ m.month }}</td><td>{{ money(m.sales) }}</td><td>{{ money(m.commission) }}</td><td>{{ money(m.refunds) }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          }

          @case ('ledger') {
            <div class="panel-body">
              <div class="actions">
                <select [(ngModel)]="kind" name="kind" (ngModelChange)="loadLedger(1)" [attr.aria-label]="t('finance.vendor.type')">
                  <option value="">{{ t('finance.vendor.allTypes') }}</option>
                  @for (k of kinds; track k) { <option [value]="k">{{ t('finance.kinds.' + k) }}</option> }
                </select>
                <input type="search" [(ngModel)]="search" name="search" [placeholder]="t('finance.vendor.searchOrder')" (keyup.enter)="loadLedger(1)" />
                <button type="button" class="btn btn-secondary btn-small" (click)="loadLedger(1)">{{ t('finance.vendor.search') }}</button>
              </div>
            </div>
            @if (ledgerLoading) {
              <p class="state">{{ t('common.states.loading') }}</p>
            } @else if (!ledger || ledger.items.length === 0) {
              <p class="state">{{ t('finance.vendor.noEntries') }}</p>
            } @else {
              <div class="table-scroll">
                <table class="data-table">
                  <thead><tr>
                    <th>{{ t('finance.vendor.date') }}</th><th>{{ t('finance.vendor.type') }}</th><th>{{ t('finance.vendor.order') }}</th>
                    <th>{{ t('finance.vendor.goods') }}</th><th>{{ t('finance.vendor.commission') }}</th><th>{{ t('finance.vendor.amount') }}</th><th>{{ t('finance.vendor.note') }}</th>
                  </tr></thead>
                  <tbody>
                    @for (e of ledger.items; track e.id) {
                      <tr>
                        <td>{{ e.createdOnUtc | date: 'short' }}</td>
                        <td>{{ t('finance.kinds.' + e.kind) }}</td>
                        <td>{{ e.shopOrderNumber ?? '' }}</td>
                        <td>{{ e.kind === 'adjustment' ? '' : money(e.gross) }}</td>
                        <td>{{ e.kind === 'adjustment' ? '' : money(e.commission) }}</td>
                        <td [class.field-error]="e.amount < 0">{{ money(e.amount) }}</td>
                        <td>{{ e.note ?? '' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="panel-body">
                <div class="actions">
                  <button type="button" class="btn btn-secondary btn-small" [disabled]="ledger.page <= 1" (click)="loadLedger(ledger.page - 1)">{{ t('finance.vendor.previous') }}</button>
                  <span class="muted">{{ ledger.page }} / {{ ledger.totalPages || 1 }}</span>
                  <button type="button" class="btn btn-secondary btn-small" [disabled]="ledger.page >= ledger.totalPages" (click)="loadLedger(ledger.page + 1)">{{ t('finance.vendor.next') }}</button>
                </div>
              </div>
            }
          }

          @case ('payouts') {
            @if (payoutsLoading) {
              <p class="state">{{ t('common.states.loading') }}</p>
            } @else if (!payouts || payouts.items.length === 0) {
              <p class="state">{{ t('finance.vendor.noPayouts') }}</p>
            } @else {
              <div class="table-scroll">
                <table class="data-table">
                  <thead><tr>
                    <th>{{ t('finance.vendor.payout') }}</th><th>{{ t('finance.vendor.date') }}</th><th>{{ t('finance.vendor.amount') }}</th>
                    <th>{{ t('finance.vendor.account') }}</th><th>{{ t('finance.vendor.status') }}</th><th>{{ t('finance.vendor.reference') }}</th><th></th>
                  </tr></thead>
                  <tbody>
                    @for (p of payouts.items; track p.id) {
                      <tr>
                        <td>{{ p.number }}</td>
                        <td>{{ p.createdOnUtc | date: 'short' }}</td>
                        <td>{{ money(p.amount) }}</td>
                        <td>{{ p.bankName }} **** {{ p.accountLast4 }}</td>
                        <td>
                          <span class="badge" [class.badge-active]="p.status === 'paid'" [class.badge-pending]="p.status === 'pending'" [class.badge-rejected]="p.status === 'failed'">{{ t('finance.payoutStatus.' + p.status) }}</span>
                          @if (p.failureReason) { <div class="muted">{{ p.failureReason }}</div> }
                        </td>
                        <td>{{ p.reference ?? '' }}</td>
                        <td><a class="btn btn-secondary btn-small" [href]="csvUrl(p)" download>{{ t('finance.vendor.csv') }}</a></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          @case ('bank') {
            <div class="panel-body">
              @if (bank) {
                <div class="banner banner-info" role="status">
                  <strong>{{ bank.bankName }}</strong> {{ bank.maskedNumber }} · {{ bank.holderName }}
                  @if (bank.branch) { · {{ bank.branch }} }
                  <div>{{ bank.usable ? t('finance.vendor.bankUsable') : t('finance.vendor.bankUsableFrom', { date: (bank.usableFromUtc | date: 'medium') }) }}</div>
                </div>
              } @else if (!bankLoading) {
                <p class="banner" role="status">{{ t('finance.vendor.noBank') }}</p>
              }
              <p class="muted">{{ t('finance.vendor.bankHint') }}</p>
              <form class="form" (ngSubmit)="saveBank()" #bankForm="ngForm">
                <label>{{ t('finance.vendor.bankName') }}
                  <select [(ngModel)]="form.bankName" name="bankName" required>
                    <option value="">{{ t('finance.vendor.chooseBank') }}</option>
                    @for (b of banks; track b) { <option [value]="b">{{ b }}</option> }
                  </select>
                  @if (fieldErrors['bankName']) { <span class="field-error" role="alert">{{ fieldErrors['bankName'] }}</span> }
                </label>
                <div class="form-row">
                  <label>{{ t('finance.vendor.accountNumber') }}
                    <input type="text" inputmode="numeric" autocomplete="off" [(ngModel)]="form.accountNumber" name="accountNumber" required />
                    @if (fieldErrors['accountNumber']) { <span class="field-error" role="alert">{{ fieldErrors['accountNumber'] }}</span> }
                  </label>
                  <label>{{ t('finance.vendor.holderName') }}
                    <input type="text" [(ngModel)]="form.holderName" name="holderName" required maxlength="200" />
                    @if (fieldErrors['holderName']) { <span class="field-error" role="alert">{{ fieldErrors['holderName'] }}</span> }
                  </label>
                </div>
                <label>{{ t('finance.vendor.branch') }}
                  <input type="text" [(ngModel)]="form.branch" name="branch" maxlength="200" />
                </label>
                <label>{{ t('finance.vendor.password') }}
                  <input type="password" autocomplete="current-password" [(ngModel)]="form.password" name="password" required />
                  <span class="hint">{{ t('finance.vendor.passwordHint') }}</span>
                  @if (fieldErrors['password']) { <span class="field-error" role="alert">{{ fieldErrors['password'] }}</span> }
                </label>
                @if (saveError) { <p class="banner" role="alert">{{ saveError }}</p> }
                @if (saveNotice) { <p class="banner banner-ok" role="status">{{ saveNotice }}</p> }
                <div class="actions"><button type="submit" class="btn" [disabled]="saving || !bankForm.valid">{{ t('finance.vendor.save') }}</button></div>
              </form>
            </div>
          }
        }
      </div>
    }
    </ng-container>
  `
})
export class VendorFinancePage implements OnInit {
  private readonly api = inject(FinanceApiService);
  private readonly auth = inject(AuthFacade);
  private readonly currency = inject(CurrencyService);
  private readonly transloco = inject(TranslocoService);

  readonly tabs: Tab[] = ['overview', 'ledger', 'payouts', 'bank'];
  readonly kinds: EntryKind[] = ['sale', 'refund', 'adjustment'];

  vendorId: number | null = null;
  loadingSession = true;
  loadError = '';
  tab: Tab = 'overview';

  overview: FinanceOverview | null = null;

  ledger: Page<LedgerEntry> | null = null;
  ledgerLoading = false;
  kind: EntryKind | '' = '';
  search = '';

  payouts: Page<Payout> | null = null;
  payoutsLoading = false;

  bank: BankAccountView | null = null;
  bankLoading = false;
  banks: string[] = [];
  form = { bankName: '', accountNumber: '', holderName: '', branch: '', password: '' };
  fieldErrors: Record<string, string> = {};
  saving = false;
  saveError = '';
  saveNotice = '';

  ngOnInit() {
    this.currency.load();
    this.auth.loadSession().subscribe({
      next: session => {
        this.vendorId = session.vendorId;
        this.loadingSession = false;
        if (this.vendorId) this.loadOverview();
      },
      error: () => { this.loadingSession = false; this.loadError = this.transloco.translate('finance.vendor.errors.load'); }
    });
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  csvUrl(payout: Payout) { return this.vendorId ? this.api.payoutCsvUrl(this.vendorId, payout.id) : ''; }

  open(tab: Tab) {
    this.tab = tab;
    this.loadError = '';
    if (tab === 'overview') this.loadOverview();
    if (tab === 'ledger') this.loadLedger(1);
    if (tab === 'payouts') this.loadPayouts();
    if (tab === 'bank') this.loadBank();
  }

  loadOverview() {
    if (!this.vendorId) return;
    this.api.overview(this.vendorId).subscribe({
      next: overview => this.overview = overview,
      error: err => this.loadError = vendorErrorMessage(err, this.transloco.translate('finance.vendor.errors.load'))
    });
  }

  loadLedger(page: number) {
    if (!this.vendorId) return;
    this.ledgerLoading = true;
    this.api.ledger(this.vendorId, this.kind, this.search, page, 20).subscribe({
      next: result => { this.ledger = result; this.ledgerLoading = false; },
      error: err => { this.ledgerLoading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('finance.vendor.errors.load')); }
    });
  }

  loadPayouts() {
    if (!this.vendorId) return;
    this.payoutsLoading = true;
    this.api.payouts(this.vendorId, 1, 50).subscribe({
      next: result => { this.payouts = result; this.payoutsLoading = false; },
      error: err => { this.payoutsLoading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('finance.vendor.errors.load')); }
    });
  }

  loadBank() {
    if (!this.vendorId) return;
    this.bankLoading = true;
    this.api.bankAccount(this.vendorId).subscribe({
      next: account => { this.bank = account; this.bankLoading = false; },
      error: err => { this.bankLoading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('finance.vendor.errors.load')); }
    });
    if (this.banks.length === 0) this.api.banks().subscribe({ next: banks => this.banks = banks });
  }

  saveBank() {
    if (!this.vendorId) return;
    this.saving = true;
    this.saveError = '';
    this.saveNotice = '';
    this.fieldErrors = {};
    this.api.saveBankAccount(this.vendorId, {
      bankName: this.form.bankName, accountNumber: this.form.accountNumber, holderName: this.form.holderName,
      branch: this.form.branch.trim() || null, password: this.form.password
    }).subscribe({
      next: account => {
        this.saving = false;
        this.bank = account;
        // The password and the number are not kept on the screen.
        this.form = { bankName: '', accountNumber: '', holderName: '', branch: '', password: '' };
        this.saveNotice = this.transloco.translate('finance.vendor.bankSaved');
      },
      error: err => {
        this.saving = false;
        const fields = err?.fieldErrors as Record<string, string[]> | undefined;
        if (err?.status === 400 && fields) {
          this.fieldErrors = Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key.charAt(0).toLowerCase() + key.slice(1), messages.join(' ')]));
        } else {
          this.saveError = vendorErrorMessage(err, this.transloco.translate('finance.vendor.errors.save'));
        }
      }
    });
  }
}
