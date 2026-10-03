import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AVAILABLE_LANGS, AppLang, setLanguage } from './i18n.providers';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <div class="language-switcher" role="group" *transloco="let t" [attr.aria-label]="t('language.label')">
      @for (lang of langs; track lang) {
        <button
          type="button"
          [attr.lang]="lang"
          [attr.aria-pressed]="lang === activeLang()"
          [title]="t('language.' + lang)"
          (click)="select(lang)">{{ lang.toUpperCase() }}</button>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; }
    .language-switcher { display: inline-flex; gap: .15rem; padding: .15rem; border: 1px solid var(--line); background: rgba(255,255,255,.55); }
    button { border: 0; padding: .35rem .55rem; background: transparent; color: var(--muted); font: 700 .7rem var(--mono-font); letter-spacing: .08em; cursor: pointer; }
    button:hover { color: var(--ink); }
    button[aria-pressed='true'] { background: var(--ink); color: var(--paper); }
  `]
})
export class LanguageSwitcherComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly langs = AVAILABLE_LANGS;
  readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  select(lang: AppLang) {
    if (lang !== this.activeLang()) {
      setLanguage(this.transloco, this.document, lang);
    }
  }
}
