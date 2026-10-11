import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

/** The UTC day, `yyyy-MM-dd`, a number of days from today (reports count days in UTC). */
export function utcDay(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export interface DayRange { from: string; to: string; }

/** Two days (both included) and quick buttons. It only reports a range it considers valid: 1 to 92 days, first day not after the last. */
@Component({
  selector: 'app-date-range',
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <form class="range" (ngSubmit)="apply()">
      <label>{{ t('reports.from') }} <input type="date" name="from" [(ngModel)]="from" [max]="to" required /></label>
      <label>{{ t('reports.to') }} <input type="date" name="to" [(ngModel)]="to" [min]="from" required /></label>
      <button type="submit" class="btn btn-small">{{ t('reports.apply') }}</button>
      @for (d of quick; track d) {
        <button type="button" class="btn btn-secondary btn-small" (click)="last(d)">{{ t('reports.lastDays', { days: d }) }}</button>
      }
    </form>
    @if (error) { <p class="error" role="alert">{{ t('reports.rangeError') }}</p> }
    </ng-container>
  `,
  styles: [`
    .range { display: flex; gap: .75rem; flex-wrap: wrap; align-items: flex-end; }
    label { display: grid; gap: .2rem; font-size: .8rem; font-weight: 500; }
    input { border: 1px solid var(--line); border-radius: 6px; padding: .35rem .5rem; font: inherit; background: var(--paper); color: var(--ink); }
    .error { color: #8d3128; margin: .5rem 0 0; font-size: .85rem; }
  `]
})
export class DateRangeComponent {
  readonly quick = [7, 30, 90];

  @Input() from = utcDay(-29);
  @Input() to = utcDay();
  @Output() rangeChange = new EventEmitter<DayRange>();

  error = '';

  last(days: number) {
    this.from = utcDay(-(days - 1));
    this.to = utcDay();
    this.apply();
  }

  apply() {
    const days = this.from && this.to ? Math.round((Date.parse(this.to) - Date.parse(this.from)) / 86_400_000) + 1 : 0;
    this.error = days < 1 || days > 92 ? 'range' : '';
    if (!this.error) this.rangeChange.emit({ from: this.from, to: this.to });
  }
}
