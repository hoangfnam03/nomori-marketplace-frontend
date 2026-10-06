import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { EmailQueueApiService } from '../../core/email/email-queue-api.service';
import { QUEUED_EMAIL_STATUSES, QueuedEmail, QueuedEmailDetail, QueuedEmailStatus } from '../../core/email/email-queue.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const PAGE_SIZE = 20;

/** The email queue: what is waiting, sent or failed, with a retry for failed emails and a read-only view of the body. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="emails-title">
      <div class="eyebrow">{{ t('admin.emails.eyebrow') }}</div>
      <h1 id="emails-title">{{ t('admin.emails.title') }}</h1>
      <p>{{ t('admin.emails.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('admin.emails.queue') }}</h2>
        <div class="actions">
          <select [(ngModel)]="status" name="status" (ngModelChange)="goTo(1)" [attr.aria-label]="t('admin.emails.filterStatus')">
            <option value="">{{ t('admin.emails.allStatuses') }}</option>
            @for (s of statuses; track s) { <option [value]="s">{{ t('admin.emails.status.' + s) }} ({{ counts[s] }})</option> }
          </select>
          <input type="search" [(ngModel)]="search" name="search" (keyup.enter)="goTo(1)" [placeholder]="t('admin.emails.searchPlaceholder')"
            [attr.aria-label]="t('common.actions.search')" />
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(1)" [disabled]="loading">{{ t('common.actions.search') }}</button>
        </div>
      </div>

      @if (notice) { <p class="banner" role="status">{{ notice }}</p> }
      @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }

      @if (loading && emails.length === 0) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="goTo(page)">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (emails.length === 0) {
        <p class="state">{{ t('admin.emails.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>{{ t('admin.emails.created') }}</th><th>{{ t('admin.emails.to') }}</th><th>{{ t('admin.emails.subject') }}</th>
              <th>{{ t('admin.common.status') }}</th><th>{{ t('admin.emails.attempts') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (e of emails; track e.id) {
                <tr>
                  <td>{{ e.createdOnUtc | date: 'short' }}</td>
                  <td>{{ e.toAddress }}<div class="muted">{{ e.kind }}</div></td>
                  <td>{{ e.subject }}</td>
                  <td>
                    <span class="badge" [class.badge-active]="e.status === 'sent'" [class.badge-pending]="e.status === 'pending' || e.status === 'sending'" [class.badge-rejected]="e.status === 'failed'">{{ t('admin.emails.status.' + e.status) }}</span>
                    @if (e.status === 'pending' && e.attempts > 0) { <div class="muted">{{ t('admin.emails.nextAttempt', { time: (e.nextAttemptUtc | date: 'short') }) }}</div> }
                    @if (e.sentOnUtc) { <div class="muted">{{ e.sentOnUtc | date: 'short' }}</div> }
                    @if (e.lastError) { <div class="muted">{{ e.lastError }}</div> }
                  </td>
                  <td>{{ e.attempts }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn btn-secondary btn-small" (click)="open(e)">{{ t('admin.emails.view') }}</button>
                      @if (e.status === 'failed') {
                        <button type="button" class="btn btn-small" (click)="retry(e)" [disabled]="busy">{{ t('admin.emails.retry') }}</button>
                      }
                      <button type="button" class="btn btn-secondary btn-small" (click)="remove(e)" [disabled]="busy || e.status === 'sending'">{{ t('common.actions.delete') }}</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav class="pagination" [attr.aria-label]="t('common.pagination.label')">
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page - 1)" [disabled]="page <= 1 || loading">{{ t('common.pagination.prev') }}</button>
          <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
          <button type="button" class="btn btn-secondary btn-small" (click)="goTo(page + 1)" [disabled]="page >= totalPages || loading">{{ t('common.pagination.next') }}</button>
        </nav>
      }
    </div>

    @if (selected) {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ selected.subject }}</h2>
          <div class="actions"><button type="button" class="btn btn-secondary btn-small" (click)="selected = null">{{ t('common.actions.close') }}</button></div>
        </div>
        <div class="panel-body">
          <p class="muted">{{ t('admin.emails.to') }}: {{ selected.toAddress }}</p>
          <!-- The body is shown as text on purpose: an administrator reads the mail, the page never runs it. -->
          <pre style="white-space:pre-wrap">{{ selected.htmlBody }}</pre>
        </div>
      </div>
    } @else if (detailLoading) {
      <p class="state">{{ t('common.states.loading') }}</p>
    }
    </ng-container>
  `
})
export class AdminEmailsPage implements OnInit {
  private readonly api = inject(EmailQueueApiService);
  private readonly transloco = inject(TranslocoService);

  readonly statuses = QUEUED_EMAIL_STATUSES;

  emails: QueuedEmail[] = [];
  counts: Record<QueuedEmailStatus, number> = { pending: 0, sending: 0, sent: 0, failed: 0 };
  status: QueuedEmailStatus | '' = '';
  search = '';
  page = 1;
  totalPages = 1;
  loading = true;
  loadError = '';
  busy = false;
  notice = '';
  actionError = '';

  selected: QueuedEmailDetail | null = null;
  detailLoading = false;

  ngOnInit() { this.goTo(1); }

  goTo(page: number) {
    this.page = Math.max(page, 1);
    this.loading = true;
    this.loadError = '';
    this.api.list(this.status, this.search, this.page, PAGE_SIZE).subscribe({
      next: result => {
        this.emails = result.items;
        this.counts = result.counts;
        this.totalPages = Math.max(result.totalPages, 1);
        this.loading = false;
        // A page that no longer exists (after a delete): go to the last one.
        if (result.items.length === 0 && this.page > this.totalPages) this.goTo(this.totalPages);
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.emails.errors.load')); }
    });
  }

  open(email: QueuedEmail) {
    this.selected = null;
    this.detailLoading = true;
    this.api.get(email.id).subscribe({
      next: detail => { this.selected = detail; this.detailLoading = false; },
      error: err => { this.detailLoading = false; this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.emails.errors.view')); }
    });
  }

  retry(email: QueuedEmail) {
    this.begin();
    this.api.retry(email.id).subscribe({
      next: () => { this.busy = false; this.notice = this.transloco.translate('admin.emails.retried'); this.goTo(this.page); },
      error: err => this.fail(err, 'retry')
    });
  }

  remove(email: QueuedEmail) {
    if (!confirm(this.transloco.translate('admin.emails.confirmDelete', { subject: email.subject }))) return;
    this.begin();
    this.api.delete(email.id).subscribe({
      next: () => {
        this.busy = false;
        this.notice = this.transloco.translate('admin.emails.deleted');
        if (this.selected?.id === email.id) this.selected = null;
        this.goTo(this.page);
      },
      error: err => this.fail(err, 'delete')
    });
  }

  private begin() {
    this.busy = true;
    this.notice = '';
    this.actionError = '';
  }

  private fail(err: { status?: number; message?: string }, key: 'retry' | 'delete') {
    this.busy = false;
    this.actionError = vendorErrorMessage(err, this.transloco.translate(`admin.emails.errors.${key}`));
    // The email moved on meanwhile (sent, being sent): show it as it is now.
    if (err?.status === 409 || err?.status === 404) this.goTo(this.page);
  }
}
