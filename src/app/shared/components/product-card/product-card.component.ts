import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardModel } from '../../models/product-card.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="product-card">
      <a class="product-image" [routerLink]="['/storefront/products', product().id]" [attr.aria-label]="'View ' + product().name">
        @if (product().badge) { <span class="badge">{{ product().badge }}</span> }
        <img [src]="product().imageUrl" [alt]="product().name" loading="lazy" />
      </a>
      <div class="product-info">
        <div class="category">{{ product().category }}</div>
        <h3><a [routerLink]="['/storefront/products', product().id]">{{ product().name }}</a></h3>
        @if (product().rating) {
          <div class="rating" [attr.aria-label]="product().rating + ' out of 5 stars'">{{ '★'.repeat(product().rating ?? 0) }}<span>{{ product().reviewCount ?? 0 }} reviews</span></div>
        }
        <div class="price-row"><strong>{{ product().price }}</strong>@if (product().compareAtPrice) { <del>{{ product().compareAtPrice }}</del> }</div>
        <button type="button" (click)="addToCart.emit(product())">Add to cart</button>
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; }
    .product-card { display: flex; flex-direction: column; height: 100%; border: 1px solid var(--line); background: rgba(255,255,255,.48); }
    .product-image { position: relative; display: block; aspect-ratio: 1 / 1.05; overflow: hidden; background: #e4e8df; }
    img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform 300ms ease; }
    .product-image:hover img { transform: scale(1.04); }
    .badge { position: absolute; top: .75rem; left: .75rem; z-index: 1; padding: .4rem .55rem; background: var(--green); color: var(--paper); font: 500 .65rem/1 var(--mono-font); letter-spacing: .08em; text-transform: uppercase; }
    .product-info { display: flex; flex: 1; flex-direction: column; padding: 1rem; }
    .category { color: var(--green); font: 500 .65rem/1 var(--mono-font); letter-spacing: .1em; text-transform: uppercase; }
    h3 { margin: .7rem 0 .55rem; font: 700 1.1rem/1.15 var(--display-font); }
    h3 a { color: var(--ink); text-decoration: none; }
    h3 a:hover { color: var(--green); }
    .rating { display: flex; gap: .5rem; align-items: center; color: #c17a28; font-size: .78rem; }
    .rating span { color: var(--muted); font: .68rem var(--mono-font); }
    .price-row { display: flex; align-items: baseline; gap: .6rem; margin-top: auto; padding-top: 1.2rem; }
    .price-row strong { font-size: 1.1rem; }
    del { color: var(--muted); font-size: .8rem; }
    button { width: 100%; margin-top: 1rem; border: 1px solid var(--ink); padding: .7rem; background: transparent; color: var(--ink); font: 700 .78rem var(--display-font); cursor: pointer; }
    button:hover { background: var(--ink); color: var(--paper); }
  `]
})
export class ProductCardComponent {
  readonly product = input.required<ProductCardModel>();
  readonly addToCart = output<ProductCardModel>();
}
