import { Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <section class="empty-state" *transloco="let t" [attr.aria-labelledby]="titleId">
      <span class="mark" aria-hidden="true">{{ mark() }}</span>
      <div><h2 [id]="titleId">{{ title() || t('common.emptyState.title') }}</h2><p>{{ message() || t('common.emptyState.message') }}</p></div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .empty-state { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem; border: 1px dashed var(--line-strong); background: rgba(255,255,255,.3); }
    .mark { display: grid; place-items: center; width: 2rem; height: 2rem; background: var(--green); color: var(--paper); font: 700 1rem var(--mono-font); }
    h2 { margin: 0 0 .4rem; font: 700 1.2rem var(--display-font); }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
  `]
})
export class EmptyStateComponent {
  readonly title = input('');
  readonly message = input('');
  readonly mark = input('?');
  readonly titleId = `empty-state-${Math.random().toString(36).slice(2)}`;
}
