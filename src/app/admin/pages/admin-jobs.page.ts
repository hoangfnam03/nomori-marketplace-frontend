import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { JobApiService } from '../../core/jobs/job-api.service';
import { Job, JobRun, MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES } from '../../core/jobs/job.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** Background jobs: schedule (on or off, interval), "Run now" and the history of one job. */
@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="jobs-title">
      <div class="eyebrow">{{ t('admin.jobs.eyebrow') }}</div>
      <h1 id="jobs-title">{{ t('admin.jobs.title') }}</h1>
      <p>{{ t('admin.jobs.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('admin.jobs.jobs') }}</h2>
        <div class="actions"><button type="button" class="btn btn-secondary btn-small" (click)="load()" [disabled]="loading">{{ t('admin.jobs.refresh') }}</button></div>
      </div>

      @if (loading && jobs.length === 0) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (jobs.length === 0) {
        <p class="state">{{ t('admin.jobs.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr>
              <th>{{ t('admin.jobs.job') }}</th><th>{{ t('admin.jobs.enabled') }}</th><th>{{ t('admin.jobs.interval') }}</th>
              <th>{{ t('admin.jobs.lastRun') }}</th><th>{{ t('admin.jobs.nextRun') }}</th><th></th>
            </tr></thead>
            <tbody>
              @for (j of jobs; track j.name) {
                <tr>
                  <td>
                    <strong>{{ j.name }}</strong>
                    <div class="muted">{{ j.description }}</div>
                    @if (rowErrors[j.name]) { <div class="field-error" role="alert">{{ rowErrors[j.name] }}</div> }
                    @if (rowNotices[j.name]) { <div class="muted" role="status">{{ rowNotices[j.name] }}</div> }
                  </td>
                  <td>
                    <label class="check-label">
                      <input type="checkbox" [(ngModel)]="edits[j.name].enabled" [name]="'enabled-' + j.name" />
                      {{ edits[j.name].enabled ? t('admin.jobs.on') : t('admin.jobs.off') }}
                    </label>
                  </td>
                  <td>
                    <input type="number" [min]="min" [max]="max" step="1" [(ngModel)]="edits[j.name].intervalMinutes" [name]="'interval-' + j.name"
                      style="width:6rem" [attr.aria-label]="t('admin.jobs.intervalLabel', { name: j.name })" />
                    <div class="muted">{{ t('admin.jobs.default', { minutes: j.defaultIntervalMinutes }) }}</div>
                  </td>
                  <td>
                    @if (j.running) {
                      <span class="badge badge-pending">{{ t('admin.jobs.status.running') }}</span>
                    } @else if (j.lastStatus) {
                      <span class="badge" [class.badge-active]="j.lastStatus === 'succeeded'" [class.badge-pending]="j.lastStatus === 'partial'" [class.badge-rejected]="j.lastStatus === 'failed'">{{ t('admin.jobs.status.' + j.lastStatus) }}</span>
                    } @else {
                      <span class="muted">{{ t('admin.jobs.never') }}</span>
                    }
                    @if (j.lastFinishedUtc) { <div class="muted">{{ j.lastFinishedUtc | date: 'short' }}</div> }
                    @if (j.lastMessage) { <div class="muted">{{ j.lastMessage }}</div> }
                  </td>
                  <td>{{ !j.enabled ? '—' : j.nextRunUtc ? (j.nextRunUtc | date: 'short') : t('admin.jobs.dueNow') }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn btn-small" (click)="save(j)" [disabled]="busy || !changed(j)">{{ t('common.actions.save') }}</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="runNow(j)" [disabled]="busy || j.running">{{ t('admin.jobs.runNow') }}</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="showRuns(j)">{{ t('admin.jobs.history') }}</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (selected) {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('admin.jobs.historyOf', { name: selected }) }}</h2>
          <div class="actions"><button type="button" class="btn btn-secondary btn-small" (click)="selected = ''">{{ t('common.actions.close') }}</button></div>
        </div>
        @if (runsLoading) {
          <p class="state">{{ t('common.states.loading') }}</p>
        } @else if (runsError) {
          <div class="panel-body">
            <p class="banner" role="alert">{{ runsError }}</p>
            <div class="actions"><button type="button" class="btn" (click)="loadRuns(selected)">{{ t('common.actions.retry') }}</button></div>
          </div>
        } @else if (runs.length === 0) {
          <p class="state">{{ t('admin.jobs.noRuns') }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr>
                <th>{{ t('admin.jobs.started') }}</th><th>{{ t('admin.jobs.trigger') }}</th><th>{{ t('admin.common.status') }}</th>
                <th>{{ t('admin.jobs.processed') }}</th><th>{{ t('admin.jobs.failed') }}</th><th>{{ t('admin.jobs.note') }}</th>
              </tr></thead>
              <tbody>
                @for (r of runs; track r.id) {
                  <tr>
                    <td>{{ r.startedUtc | date: 'medium' }}</td>
                    <td>{{ t('admin.jobs.triggers.' + r.trigger) }}</td>
                    <td><span class="badge" [class.badge-active]="r.status === 'succeeded'" [class.badge-pending]="r.status === 'partial'" [class.badge-rejected]="r.status === 'failed'">{{ t('admin.jobs.status.' + r.status) }}</span></td>
                    <td>{{ r.processed }}</td>
                    <td>{{ r.failed }}</td>
                    <td>{{ r.message ?? '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
    </ng-container>
  `
})
export class AdminJobsPage implements OnInit {
  private readonly api = inject(JobApiService);
  private readonly transloco = inject(TranslocoService);

  readonly min = MIN_INTERVAL_MINUTES;
  readonly max = MAX_INTERVAL_MINUTES;

  jobs: Job[] = [];
  /** What the administrator is typing, per job, kept apart from what the server says. */
  edits: Record<string, { enabled: boolean; intervalMinutes: number }> = {};
  loading = true;
  loadError = '';
  busy = false;
  rowErrors: Record<string, string> = {};
  rowNotices: Record<string, string> = {};

  selected = '';
  runs: JobRun[] = [];
  runsLoading = false;
  runsError = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.list().subscribe({
      next: jobs => {
        this.jobs = jobs;
        this.edits = Object.fromEntries(jobs.map(j => [j.name, { enabled: j.enabled, intervalMinutes: j.intervalMinutes }]));
        this.loading = false;
      },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.jobs.errors.load')); }
    });
  }

  changed(job: Job) {
    const edit = this.edits[job.name];
    return !!edit && (edit.enabled !== job.enabled || Number(edit.intervalMinutes) !== job.intervalMinutes);
  }

  save(job: Job) {
    const edit = this.edits[job.name];
    const interval = Number(edit.intervalMinutes);
    if (!Number.isInteger(interval) || interval < this.min || interval > this.max) {
      this.setRow(job.name, this.transloco.translate('admin.jobs.errors.interval', { min: this.min, max: this.max }), '');
      return;
    }
    this.busy = true;
    this.setRow(job.name, '', '');
    this.api.update(job.name, { enabled: edit.enabled, intervalMinutes: interval }).subscribe({
      next: updated => {
        this.busy = false;
        this.replace(updated);
        this.setRow(job.name, '', this.transloco.translate('admin.jobs.saved'));
      },
      error: err => {
        this.busy = false;
        this.setRow(job.name, vendorErrorMessage(err, this.transloco.translate('admin.jobs.errors.save')), '');
      }
    });
  }

  runNow(job: Job) {
    this.busy = true;
    this.setRow(job.name, '', '');
    this.api.run(job.name).subscribe({
      next: run => {
        this.busy = false;
        this.setRow(job.name, '', this.transloco.translate('admin.jobs.ran', { status: this.transloco.translate('admin.jobs.status.' + run.status), processed: run.processed, failed: run.failed }));
        this.refreshOne(job.name);
        if (this.selected === job.name) this.loadRuns(job.name);
      },
      error: err => {
        this.busy = false;
        this.setRow(job.name, vendorErrorMessage(err, this.transloco.translate('admin.jobs.errors.run')), '');
        // Someone else may be running it: show it as it is now.
        if (err?.status === 409) this.refreshOne(job.name);
      }
    });
  }

  showRuns(job: Job) {
    this.selected = job.name;
    this.loadRuns(job.name);
  }

  loadRuns(name: string) {
    this.runsLoading = true;
    this.runsError = '';
    this.api.runs(name).subscribe({
      next: runs => { this.runs = runs; this.runsLoading = false; },
      error: err => { this.runsLoading = false; this.runsError = vendorErrorMessage(err, this.transloco.translate('admin.jobs.errors.runs')); }
    });
  }

  private refreshOne(name: string) {
    this.api.list().subscribe({ next: jobs => { const fresh = jobs.find(j => j.name === name); if (fresh) this.replace(fresh); } });
  }

  private replace(updated: Job) {
    this.jobs = this.jobs.map(j => j.name === updated.name ? updated : j);
    this.edits = { ...this.edits, [updated.name]: { enabled: updated.enabled, intervalMinutes: updated.intervalMinutes } };
  }

  private setRow(name: string, error: string, notice: string) {
    this.rowErrors = { ...this.rowErrors, [name]: error };
    this.rowNotices = { ...this.rowNotices, [name]: notice };
  }

}
