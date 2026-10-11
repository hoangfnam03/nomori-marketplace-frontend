import { Component, inject, Input, OnChanges } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TrackingApiService } from '../../../core/shipping/tracking-api.service';
import { Tracking, TRACKING_STATUSES, TrackingStatus } from '../../../core/shipping/tracking.models';
import { vendorErrorMessage } from '../../../core/vendors/vendor-errors';

/**
 * The parcel of one shop order: carrier, tracking number (a link when the carrier has a page) and the journey, newest first.
 * A member of the shop (the page passes its shop id) can also add events while the order is shipped.
 */
@Component({
  selector: 'app-parcel-tracking',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <div class="parcel">
      <p class="line">
        <strong>{{ t('orders.tracking') }}:</strong> {{ carrier }} ·
        @if (tracking?.trackingUrl; as url) {
          <a [href]="url" target="_blank" rel="noopener noreferrer">{{ trackingNumber }}</a>
        } @else {
          {{ trackingNumber }}
        }
      </p>

      @if (error) { <p class="error" role="alert">{{ error }}</p> }

      @if (tracking && tracking.events.length > 0) {
        <ol class="events" [attr.aria-label]="t('tracking.journey')">
          @for (e of tracking.events; track e.id) {
            <li>
              <span class="dot" [class.problem]="e.status === 'exception' || e.status === 'delivery_attempted'" aria-hidden="true"></span>
              <div>
                <strong>{{ t('tracking.status.' + e.status) }}</strong>@if (e.location) { <span> · {{ e.location }}</span> }
                <div class="muted">{{ e.occurredOnUtc | date: 'medium' }}</div>
                @if (e.note) { <div>{{ e.note }}</div> }
              </div>
            </li>
          }
        </ol>
      } @else if (tracking && !vendorId) {
        <p class="muted">{{ t('tracking.noEvents') }}</p>
      }

      @if (vendorId && tracking?.orderStatus === 'shipped') {
        <details class="add">
          <summary>{{ t('tracking.add') }}</summary>
          <form class="form" (ngSubmit)="add()">
            <label>{{ t('tracking.statusLabel') }}
              <select name="status" [(ngModel)]="status" required>
                @for (s of statuses; track s) { <option [value]="s">{{ t('tracking.status.' + s) }}</option> }
              </select>
            </label>
            <label>{{ t('tracking.location') }}
              <input type="text" name="location" [(ngModel)]="location" maxlength="100" />
            </label>
            <label>{{ t('tracking.note') }}
              <input type="text" name="note" [(ngModel)]="note" maxlength="500" />
            </label>
            @if (formError) { <p class="error" role="alert">{{ formError }}</p> }
            <div><button type="submit" class="btn btn-small" [disabled]="busy">{{ t('tracking.addButton') }}</button></div>
          </form>
        </details>
      }
    </div>
    </ng-container>
  `,
  styles: [`
    .parcel { display: grid; gap: .5rem; font-size: .85rem; }
    .line { margin: 0; }
    .muted { color: var(--muted); font-size: .8rem; }
    .error { color: #8d3128; margin: 0; }
    .events { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; border-left: 2px solid var(--line); margin-left: .35rem; }
    .events li { display: grid; grid-template-columns: 1rem minmax(0, 1fr); gap: .5rem; margin-left: -.45rem; }
    .dot { width: .6rem; height: .6rem; border-radius: 50%; background: var(--green); margin-top: .3rem; justify-self: center; }
    .dot.problem { background: #b74e3c; }
    .add summary { cursor: pointer; color: var(--muted); }
    .form { display: grid; gap: .6rem; margin-top: .5rem; max-width: 28rem; }
    .form label { display: grid; gap: .25rem; font-weight: 500; }
    .form input, .form select { border: 1px solid var(--line); border-radius: 6px; padding: .4rem .6rem; font: inherit; background: var(--paper); color: var(--ink); }
  `]
})
export class ParcelTrackingComponent implements OnChanges {
  private readonly api = inject(TrackingApiService);
  private readonly transloco = inject(TranslocoService);

  @Input({ required: true }) shopOrderId!: number;
  @Input() carrier: string | null = null;
  @Input() trackingNumber: string | null = null;
  /** The order's status: the journey is read again when it changes. */
  @Input() orderStatus = '';
  /** Set by the shop's own page: shows the form that adds events. */
  @Input() vendorId: number | null = null;

  readonly statuses = TRACKING_STATUSES;
  tracking: Tracking | null = null;
  error = '';
  formError = '';
  busy = false;
  status: TrackingStatus = 'in_transit';
  location = '';
  note = '';

  ngOnChanges() { this.load(); }

  private load() {
    this.error = '';
    this.api.tracking(this.shopOrderId).subscribe({
      next: tracking => this.tracking = tracking,
      error: err => this.error = vendorErrorMessage(err, this.transloco.translate('tracking.errors.load'))
    });
  }

  add() {
    if (!this.vendorId) return;
    this.busy = true;
    this.formError = '';
    this.api.addEvent(this.vendorId, this.shopOrderId, { status: this.status, location: this.location.trim() || null, note: this.note.trim() || null }).subscribe({
      next: tracking => { this.busy = false; this.tracking = tracking; this.location = ''; this.note = ''; },
      error: err => { this.busy = false; this.formError = vendorErrorMessage(err, this.transloco.translate('tracking.errors.add')); }
    });
  }
}
