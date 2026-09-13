import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a routerLink="/storefront">Home</a>
      @for (item of items(); track item.label; let last = $last) {
        <span aria-hidden="true">/</span>
        @if (item.url && !last) {
          <a [routerLink]="item.url">{{ item.label }}</a>
        } @else {
          <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .breadcrumb { display: flex; flex-wrap: wrap; gap: 0.55rem; align-items: center; color: var(--muted); font: 500 0.75rem/1 var(--mono-font); letter-spacing: 0.05em; text-transform: uppercase; }
    a { color: var(--green); text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class BreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
