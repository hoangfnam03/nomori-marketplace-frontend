import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CurrencyService } from '../../core/money/currency.service';
import { PaymentApiService } from '../../core/payments/payment-api.service';
import { PAYMENT_STATUSES, Payment, PaymentMethod, PaymentStatus } from '../../core/payments/payment.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

/** Payment methods (on or off, order) and the payments with capture, void and refund. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="payments-title">
      <div class="eyebrow">{{ t('admin.payments.eyebrow') }}</div>
      <h1 id="payments-title">{{ t('admin.payments.title') }}</h1>
      <p>{{ t('admin.payments.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header"><h2>{{ t('admin.payments.methods') }}</h2></div>
      @if (methodsError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ methodsError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="loadMethods()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (methods.length === 0) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>{{ t('admin.common.name') }}</th><th>{{ t('admin.payments.kind') }}</th>
              <th>{{ t('admin.payments.enabled') }}</th><th>{{ t('admin.common.order') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (m of methods; track m.systemName) {
                <tr>
                  <td><strong>{{ m.displayName }}</strong> <span class="muted">{{ m.systemName }}</span>
                    @if (!m.registered) { <div class="field-error">{{ t('admin.payments.notRegistered') }}</div> }
                  </td>
                  <td>{{ m.isOffline ? t('admin.payments.offline') : t('admin.payments.gateway') }}</td>
                  <td>
                    <label class="check-label">
                      <input type="checkbox" [(ngModel)]="m.enabled" [name]="'enabled-' + m.systemName" [disabled]="!m.registered && !m.enabled" />
                      {{ m.enabled ? t('admin.payments.on') : t('admin.payments.off') }}
                    </label>
                  </td>
                  <td><input type="number" min="0" max="10000" step="1" [(ngModel)]="m.displayOrder" [name]="'order-' + m.systemName" style="width:5rem" /></td>
                  <td><button type="button" class="btn btn-small" (click)="saveMethod(m)" [disabled]="busy">{{ t('common.actions.save') }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      @if (methodNotice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ methodNotice }}</p></div> }
      @if (methodError) { <div class="panel-body"><p class="banner" role="alert">{{ methodError }}</p></div> }
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('admin.payments.payments') }}</h2>
        <div class="actions">
          <label class="sr-only" for="status-filter">{{ t('admin.common.status') }}</label>
          <select id="status-filter" [(ngModel)]="status" name="status" (ngModelChange)="goTo(1)">
            <option value="">{{ t('admin.payments.allStatuses') }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ t('admin.payments.status.' + s) }}</option> }
          </select>
        </div>
      </div>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="goTo(page)">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (payments.length === 0) {
        <p class="state">{{ t('admin.payments.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>{{ t('admin.payments.reference') }}</th><th>{{ t('admin.payments.method') }}</th>
              <th>{{ t('admin.payments.amount') }}</th><th>{{ t('admin.payments.refunded') }}</th>
              <th>{{ t('admin.common.status') }}</th><th>{{ t('admin.payments.updated') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (p of payments; track p.id) {
                <tr>
                  <td>{{ p.id }}</td>
                  <td>{{ p.referenceType }} {{ p.referenceId }}</td>
                  <td>{{ p.method }}</td>
                  <td>{{ money(p.amount) }}</td>
                  <td>{{ p.refundedAmount > 0 ? money(p.refundedAmount) : '—' }}</td>
                  <td><span class="badge" [class.badge-active]="p.status === 'paid'" [class.badge-pending]="p.status === 'pending' || p.status === 'authorized'" [class.badge-rejected]="p.status === 'failed'">{{ t('admin.payments.status.' + p.status) }}</span></td>
                  <td>{{ p.updatedOnUtc | date: 'short' }}</td>
                  <td>
                    <div class="row-actions">
                      @if (p.status === 'pending' || p.status === 'authorized') {
                        <button type="button" class="btn btn-small" (click)="run(p, 'capture')" [disabled]="busy">{{ t('admin.payments.capture') }}</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="run(p, 'void')" [disabled]="busy">{{ t('admin.payments.void') }}</button>
                      }
                      @if (p.refundable > 0) {
                        @if (refunding?.id === p.id) {
                          <input type="number" min="0" [max]="p.refundable" [step]="currency.step()" [(ngModel)]="refundAmount" name="refund" style="width:6rem"
                            [attr.aria-label]="t('admin.payments.refundAmount')" />
                          <button type="button" class="btn btn-small" (click)="refund(p)" [disabled]="busy">{{ t('admin.payments.refundConfirm') }}</button>
                          <button type="button" class="btn btn-secondary btn-small" (click)="refunding = null">{{ t('common.actions.cancel') }}</button>
                        } @else {
                          <button type="button" class="btn btn-secondary btn-small" (click)="startRefund(p)" [disabled]="busy">{{ t('admin.payments.refund') }}</button>
                        }
                      }
                    </div>
                    @if (rowErrors[p.id]) { <div class="field-error" role="alert">{{ rowErrors[p.id] }}</div> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page - 1)" [disabled]="page <= 1">{{ t('common.actions.back') }}</button>
          <span>{{ t('admin.payments.pageOf', { page: page, total: totalPages }) }}</span>
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page + 1)" [disabled]="page >= totalPages">{{ t('admin.payments.next') }}</button>
        </div>
      }
    </div>
    </ng-container>
  `,
  styles: [`.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }`]
})
export class AdminPaymentsPage implements OnInit {
  private readonly api = inject(PaymentApiService);
  private readonly transloco = inject(TranslocoService);
  protected readonly currency = inject(CurrencyService);

  readonly statuses = PAYMENT_STATUSES;

  methods: PaymentMethod[] = [];
  methodsError = '';
  methodError = '';
  methodNotice = '';
  payments: Payment[] = [];
  status: PaymentStatus | '' = '';
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';
  busy = false;
  rowErrors: Record<number, string> = {};
  refunding: Payment | null = null;
  refundAmount: number | null = null;

  ngOnInit() {
    this.currency.load();
    this.loadMethods();
    this.goTo(1);
  }

  money(value: number) { return this.currency.formatPrimary(value); }

  loadMethods() {
    this.methodsError = '';
    this.api.methods().subscribe({
      next: methods => { this.methods = methods; },
      error: err => { this.methodsError = vendorErrorMessage(err, this.transloco.translate('admin.payments.errors.loadMethods')); }
    });
  }

  saveMethod(method: PaymentMethod) {
    this.busy = true;
    this.methodError = '';
    this.methodNotice = '';
    this.api.updateMethod(method.systemName, { enabled: method.enabled, displayOrder: Number(method.displayOrder) || 0 }).subscribe({
      next: () => { this.busy = false; this.methodNotice = this.transloco.translate('admin.payments.methodSaved'); this.loadMethods(); },
      error: err => {
        this.busy = false;
        this.methodError = vendorErrorMessage(err, this.transloco.translate('admin.payments.errors.saveMethod'));
        this.loadMethods();
      }
    });
  }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.api.payments(this.status, this.page, PAGE_SIZE).subscribe({
      next: result => {
        this.payments = result.items;
        this.totalPages = Math.max(result.totalPages, 1);
        this.loading = false;
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.payments.errors.load')); }
    });
  }

  run(payment: Payment, action: 'capture' | 'void') {
    this.apply(payment, action === 'capture' ? this.api.capture(payment.id) : this.api.void(payment.id));
  }

  startRefund(payment: Payment) {
    this.refunding = payment;
    this.refundAmount = payment.refundable;
    this.rowErrors = { ...this.rowErrors, [payment.id]: '' };
  }

  refund(payment: Payment) {
    const amount = this.refundAmount;
    if (amount === null || !(amount > 0) || amount > payment.refundable) {
      this.rowErrors = { ...this.rowErrors, [payment.id]: this.transloco.translate('admin.payments.errors.refundRange', { max: this.money(payment.refundable) }) };
      return;
    }
    this.apply(payment, this.api.refund(payment.id, amount));
  }

  private apply(payment: Payment, request: ReturnType<PaymentApiService['capture']>) {
    this.busy = true;
    this.rowErrors = { ...this.rowErrors, [payment.id]: '' };
    request.subscribe({
      next: updated => {
        this.busy = false;
        this.refunding = null;
        this.payments = this.payments.map(p => p.id === updated.id ? updated : p);
      },
      error: err => {
        this.busy = false;
        this.rowErrors = { ...this.rowErrors, [payment.id]: vendorErrorMessage(err, this.transloco.translate('admin.payments.errors.action')) };
        // The payment may have moved on (a callback, another administrator): show it as it is now.
        if (err?.status === 409 || err?.status === 404) this.goTo(this.page);
      }
    });
  }
}
