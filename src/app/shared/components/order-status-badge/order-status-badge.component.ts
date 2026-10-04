import { Component, Input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/** The status of a shop order or of a whole order, as a coloured label. */
@Component({
  selector: 'app-order-status-badge',
  standalone: true,
  imports: [TranslocoDirective],
  template: `<span *transloco="let t" class="badge" [attr.data-status]="status">{{ t('orders.status.' + status) }}</span>`,
  styles: [`
    .badge { display: inline-block; padding: .1rem .55rem; border-radius: 999px; font-size: .75rem; font-weight: 600; border: 1px solid var(--line); background: var(--paper); color: var(--muted); }
    .badge[data-status="pending"], .badge[data-status="processing"] { color: #8a5a00; border-color: #e3c987; background: #fbf3dc; }
    .badge[data-status="confirmed"], .badge[data-status="shipped"] { color: #205e4a; border-color: #b9d6c7; background: #eef6f1; }
    .badge[data-status="delivered"], .badge[data-status="completed"] { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, var(--line)); background: #e5f0e9; }
    .badge[data-status="cancelled"] { color: #a84031; border-color: #e4b3aa; background: #f8e9e4; }
  `]
})
export class OrderStatusBadgeComponent {
  @Input({ required: true }) status = '';
}
