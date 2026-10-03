import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { CurrencyService } from '../../../core/money/currency.service';

/** Lets a customer browse in another currency. Hidden while there is only one published currency. */
@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    @if (currency.currencies().length > 1) {
      <label class="currency" *transloco="let t">
        <span class="sr-only">{{ t('currency.display') }}</span>
        <select [value]="currency.display().code" (change)="choose($event)" [attr.aria-label]="t('currency.display')"
          [title]="t('currency.approximate', { code: currency.primary().code })">
          @for (c of currency.currencies(); track c.code) {
            <option [value]="c.code" [selected]="c.code === currency.display().code">{{ c.code }}@if (c.symbol) { ({{ c.symbol }}) }</option>
          }
        </select>
      </label>
    }
  `,
  styles: [`
    :host { display: inline-block; }
    select { border: 1px solid var(--line-strong); padding: .3rem .5rem; background: transparent; color: var(--ink); font: .75rem var(--mono-font); cursor: pointer; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `]
})
export class CurrencySelectorComponent {
  readonly currency = inject(CurrencyService);

  choose(event: Event) {
    this.currency.select((event.target as HTMLSelectElement).value);
  }
}
