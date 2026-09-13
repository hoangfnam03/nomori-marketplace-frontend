import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="search-box" role="search" (submit)="submitSearch($event)">
      <label class="sr-only" for="marketplace-search">Search products</label>
      <input id="marketplace-search" name="query" [(ngModel)]="query" placeholder="Search the marketplace" autocomplete="off" />
      <button type="submit" aria-label="Search">Search</button>
    </form>
  `,
  styles: [`
    :host { display: block; }
    .search-box { display: flex; min-width: min(100%, 28rem); border: 1px solid var(--line-strong); background: rgba(255,255,255,.55); }
    input { min-width: 0; flex: 1; border: 0; padding: .75rem .9rem; color: var(--ink); background: transparent; font: inherit; }
    input:focus { outline: 0; }
    button { border: 0; border-left: 1px solid var(--line-strong); padding: .75rem 1rem; background: var(--ink); color: var(--paper); font-weight: 700; cursor: pointer; }
    button:hover { background: var(--green); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `]
})
export class SearchBoxComponent {
  readonly searched = output<string>();
  query = '';

  submitSearch(event: SubmitEvent) {
    event.preventDefault();
    this.searched.emit(this.query.trim());
  }
}
