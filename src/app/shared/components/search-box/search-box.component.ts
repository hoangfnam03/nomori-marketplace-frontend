import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { CatalogApiService } from '../../../core/catalog/catalog-api.service';
import { ProductSuggestion } from '../../../core/catalog/catalog.models';
import { MediaApiService } from '../../../core/media/media-api.service';
import { CurrencyService } from '../../../core/money/currency.service';

const MIN_CHARACTERS = 2;

/** Search field with suggestions: the combobox pattern, so it works with a keyboard and a screen reader. */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  template: `
    <form class="search-box" role="search" *transloco="let t" (submit)="submitSearch($event)">
      <label class="sr-only" for="marketplace-search">{{ t('storefront.search.label') }}</label>
      <input
        id="marketplace-search" name="query" [(ngModel)]="query" [placeholder]="t('storefront.search.placeholder')" autocomplete="off"
        role="combobox" aria-autocomplete="list" aria-controls="search-suggestions" [attr.aria-expanded]="open && suggestions.length > 0"
        [attr.aria-activedescendant]="active >= 0 ? 'suggestion-' + active : null"
        (ngModelChange)="onInput($event)" (keydown)="onKey($event)" (blur)="closeSoon()" (focus)="open = suggestions.length > 0" />
      <button type="submit">{{ t('storefront.search.submit') }}</button>
      @if (open && suggestions.length > 0) {
        <ul class="suggestions" id="search-suggestions" role="listbox" [attr.aria-label]="t('storefront.search.suggestions')">
          @for (s of suggestions; track s.id; let i = $index) {
            <li role="option" [id]="'suggestion-' + i" [class.active]="i === active" [attr.aria-selected]="i === active" (mousedown)="choose(s)">
              @if (picture(s); as url) { <img [src]="url" alt="" loading="lazy" /> } @else { <span class="thumb" aria-hidden="true"></span> }
              <span class="name">{{ s.name }}</span>
              <span class="price">{{ price(s.price) }}</span>
            </li>
          }
        </ul>
      }
    </form>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .search-box { position: relative; display: flex; min-width: min(100%, 28rem); border: 1px solid var(--line-strong); background: rgba(255,255,255,.55); }
    input { min-width: 0; flex: 1; border: 0; padding: .75rem .9rem; color: var(--ink); background: transparent; font: inherit; }
    input:focus { outline: 0; }
    .search-box:focus-within { outline: 2px solid var(--green); outline-offset: 1px; }
    button { border: 0; border-left: 1px solid var(--line-strong); padding: .75rem 1rem; background: var(--ink); color: var(--paper); font-weight: 700; cursor: pointer; }
    button:hover { background: var(--green); }
    .suggestions { position: absolute; z-index: 20; top: 100%; left: -1px; right: -1px; margin: 0; padding: 0; list-style: none; background: var(--paper); border: 1px solid var(--line-strong); border-top: 0; box-shadow: 0 8px 20px rgba(0,0,0,.08); }
    .suggestions li { display: flex; align-items: center; gap: .7rem; padding: .5rem .8rem; cursor: pointer; font-size: .9rem; }
    .suggestions li.active, .suggestions li:hover { background: rgba(39,116,93,.1); }
    .thumb, img { width: 36px; height: 36px; flex: none; object-fit: cover; background: #e4e8df; }
    .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .price { color: var(--muted); font: .78rem var(--mono-font); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `]
})
export class SearchBoxComponent {
  private readonly api = inject(CatalogApiService);
  private readonly router = inject(Router);
  private readonly media = inject(MediaApiService);
  private readonly currency = inject(CurrencyService);
  private readonly typed = new Subject<string>();

  /** The text to show, for example the current search of the list page. */
  readonly value = input('');
  readonly searched = output<string>();

  query = '';
  suggestions: ProductSuggestion[] = [];
  open = false;
  active = -1;

  constructor() {
    effect(() => { this.query = this.value(); });

    // Only the latest request counts, so a slow answer for old text never replaces a newer one.
    this.typed.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(text => text.length < MIN_CHARACTERS ? of([]) : this.api.suggest(text).pipe(catchError(() => of([])))),
      takeUntilDestroyed(inject(DestroyRef))
    ).subscribe(list => {
      this.suggestions = list;
      this.active = -1;
      this.open = list.length > 0;
    });
  }

  onInput(text: string) { this.typed.next((text ?? '').trim()); }

  picture(s: ProductSuggestion) { return this.media.url(s.mainPictureId); }

  price(value: number) { return this.currency.format(value); }

  onKey(event: KeyboardEvent) {
    if (!this.open || this.suggestions.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); this.active = (this.active + 1) % this.suggestions.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); this.active = this.active <= 0 ? this.suggestions.length - 1 : this.active - 1; }
    else if (event.key === 'Escape') { this.open = false; this.active = -1; }
    else if (event.key === 'Enter' && this.active >= 0) { event.preventDefault(); this.choose(this.suggestions[this.active]); }
  }

  choose(suggestion: ProductSuggestion) {
    this.open = false;
    this.router.navigate(['/storefront/products', suggestion.id]);
  }

  /** Waits a moment so a click on a suggestion lands before the list disappears. */
  closeSoon() { setTimeout(() => { this.open = false; }, 150); }

  submitSearch(event: SubmitEvent) {
    event.preventDefault();
    this.open = false;
    this.searched.emit(this.query.trim());
  }
}
