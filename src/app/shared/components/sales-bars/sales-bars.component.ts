import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { DailySales } from '../../../core/reports/report.models';

/** Sales per day as plain CSS bars (no chart library), with the same numbers in a table for screen readers and for exact reading. */
@Component({
  selector: 'app-sales-bars',
  standalone: true,
  imports: [DatePipe, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    @if (days.length === 0 || max === 0) {
      <p class="empty">{{ t('reports.noSales') }}</p>
    } @else {
      <div class="bars" role="img" [attr.aria-label]="t('reports.barsLabel', { orders: totalOrders, sales: format(totalSales) })">
        @for (d of days; track d.day) {
          <div class="bar" [style.height.%]="height(d)" [title]="(d.day | date: 'mediumDate') + ': ' + format(d.sales) + ' · ' + d.orders"></div>
        }
      </div>
      <div class="axis"><span>{{ days[0].day | date: 'shortDate' }}</span><span>{{ days[days.length - 1].day | date: 'shortDate' }}</span></div>
      <details>
        <summary>{{ t('reports.showTable') }}</summary>
        <table class="data-table">
          <thead><tr><th>{{ t('reports.day') }}</th><th>{{ t('reports.orders') }}</th><th>{{ t('reports.sales') }}</th></tr></thead>
          <tbody>
            @for (d of days; track d.day) {
              @if (d.orders > 0) { <tr><td>{{ d.day | date: 'mediumDate' }}</td><td>{{ d.orders }}</td><td>{{ format(d.sales) }}</td></tr> }
            }
          </tbody>
        </table>
      </details>
    }
    </ng-container>
  `,
  styles: [`
    .bars { display: flex; align-items: flex-end; gap: 2px; height: 140px; border-bottom: 1px solid var(--line); }
    .bar { flex: 1 1 0; min-width: 2px; background: var(--green); border-radius: 2px 2px 0 0; min-height: 1px; opacity: .85; }
    .bar:hover { opacity: 1; }
    .axis { display: flex; justify-content: space-between; color: var(--muted); font-size: .75rem; margin-top: .25rem; }
    .empty { color: var(--muted); margin: 0; }
    details { margin-top: .75rem; font-size: .85rem; }
    summary { cursor: pointer; color: var(--muted); }
    .data-table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
    .data-table th, .data-table td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--line); }
  `]
})
export class SalesBarsComponent {
  @Input({ required: true }) days: DailySales[] = [];
  @Input({ required: true }) format: (value: number) => string = value => String(value);

  get max() { return Math.max(0, ...this.days.map(d => d.sales)); }
  get totalSales() { return this.days.reduce((sum, d) => sum + d.sales, 0); }
  get totalOrders() { return this.days.reduce((sum, d) => sum + d.orders, 0); }

  height(day: DailySales) { return this.max === 0 ? 0 : Math.max(1, Math.round((day.sales / this.max) * 100)); }
}
