import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TrackingApiService } from '../../core/shipping/tracking-api.service';
import { Carrier } from '../../core/shipping/tracking.models';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

/** The carriers shops can pick when they ship, and the address that gives the customer a link to the carrier's own tracking page. */
@Component({
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="carriers-title">
      <div class="eyebrow">{{ t('admin.carriers.eyebrow') }}</div>
      <h1 id="carriers-title">{{ t('admin.carriers.title') }}</h1>
      <p>{{ t('admin.carriers.lede') }}</p>
    </section>

    <div class="panel">
      <div class="panel-header"><h2>{{ editingId ? t('admin.carriers.edit') : t('admin.carriers.add') }}</h2></div>
      <div class="panel-body">
        <form class="form" (ngSubmit)="save()">
          <div class="form-row">
            <label>{{ t('admin.carriers.name') }} *
              <input type="text" name="name" [(ngModel)]="form.name" maxlength="100" required />
              @if (fieldError('name'); as e) { <span class="field-error" role="alert">{{ e }}</span> }
            </label>
            <label>{{ t('admin.carriers.order') }}
              <input type="number" name="displayOrder" [(ngModel)]="form.displayOrder" min="0" max="10000" step="1" />
            </label>
          </div>
          <label>{{ t('admin.carriers.template') }}
            <input type="text" name="template" [(ngModel)]="form.trackingUrlTemplate" maxlength="500" placeholder="https://carrier.example/track?n={tracking}" />
            <span class="hint">{{ t('admin.carriers.templateHint') }}</span>
            @if (fieldError('trackingUrlTemplate'); as e) { <span class="field-error" role="alert">{{ e }}</span> }
          </label>
          <label class="check-label"><input type="checkbox" name="active" [(ngModel)]="form.active" /> {{ t('admin.carriers.active') }}</label>
          @if (saveError) { <p class="banner" role="alert">{{ saveError }}</p> }
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ t('common.actions.save') }}</button>
            @if (editingId) { <button type="button" class="btn btn-secondary" (click)="reset()">{{ t('common.actions.cancel') }}</button> }
          </div>
        </form>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header"><h2>{{ t('admin.carriers.list') }}</h2></div>
      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">{{ t('common.actions.retry') }}</button></div>
        </div>
      } @else if (carriers.length === 0) {
        <p class="state">{{ t('admin.carriers.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>{{ t('admin.carriers.name') }}</th><th>{{ t('admin.carriers.template') }}</th><th>{{ t('admin.carriers.order') }}</th><th>{{ t('admin.common.status') }}</th><th></th></tr></thead>
            <tbody>
              @for (c of carriers; track c.id) {
                <tr>
                  <td>{{ c.name }}</td>
                  <td class="muted">{{ c.trackingUrlTemplate ?? '—' }}</td>
                  <td>{{ c.displayOrder }}</td>
                  <td><span class="badge" [class.badge-active]="c.active" [class.badge-pending]="!c.active">{{ c.active ? t('admin.carriers.on') : t('admin.carriers.off') }}</span></td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="btn btn-secondary btn-small" (click)="startEdit(c)" [disabled]="busy">{{ t('common.actions.edit') }}</button>
                      <button type="button" class="btn btn-danger btn-small" (click)="remove(c)" [disabled]="busy">{{ t('common.actions.delete') }}</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    </ng-container>
  `
})
export class AdminCarriersPage implements OnInit {
  private readonly api = inject(TrackingApiService);
  private readonly transloco = inject(TranslocoService);

  carriers: Carrier[] = [];
  loading = true;
  loadError = '';
  busy = false;
  saveError = '';
  fieldErrors: Record<string, string[]> = {};
  editingId: number | null = null;
  form = this.blank();

  ngOnInit() { this.load(); }

  fieldError(name: string) { return this.fieldErrors[name]?.join(' ') ?? ''; }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.adminCarriers().subscribe({
      next: carriers => { this.carriers = carriers; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.carriers.errors.load')); }
    });
  }

  startEdit(carrier: Carrier) {
    this.editingId = carrier.id;
    this.form = { name: carrier.name, trackingUrlTemplate: carrier.trackingUrlTemplate ?? '', active: carrier.active, displayOrder: carrier.displayOrder };
    this.saveError = '';
    this.fieldErrors = {};
  }

  reset() {
    this.editingId = null;
    this.form = this.blank();
    this.saveError = '';
    this.fieldErrors = {};
  }

  save() {
    this.busy = true;
    this.saveError = '';
    this.fieldErrors = {};
    const body = {
      name: this.form.name.trim(), trackingUrlTemplate: this.form.trackingUrlTemplate.trim() || null,
      active: this.form.active, displayOrder: Number(this.form.displayOrder) || 0
    };
    const request = this.editingId ? this.api.updateCarrier(this.editingId, body) : this.api.createCarrier(body);
    request.subscribe({
      next: () => { this.busy = false; this.reset(); this.load(); },
      error: err => {
        this.busy = false;
        if (err?.status === 400 && err.fieldErrors) this.fieldErrors = err.fieldErrors;
        else this.saveError = vendorErrorMessage(err, this.transloco.translate('admin.carriers.errors.save'));
      }
    });
  }

  remove(carrier: Carrier) {
    if (!window.confirm(this.transloco.translate('admin.carriers.confirmDelete', { name: carrier.name }))) return;
    this.busy = true;
    this.saveError = '';
    this.api.deleteCarrier(carrier.id).subscribe({
      next: () => { this.busy = false; if (this.editingId === carrier.id) this.reset(); this.load(); },
      error: err => { this.busy = false; this.saveError = vendorErrorMessage(err, this.transloco.translate('admin.carriers.errors.delete')); }
    });
  }

  private blank() { return { name: '', trackingUrlTemplate: '', active: true, displayOrder: 0 }; }
}
