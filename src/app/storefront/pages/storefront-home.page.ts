import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="eyebrow">Storefront / Foundation</div>
      <h1 id="welcome-title">A calm base for a busy marketplace.</h1>
      <p class="lede">The storefront boundary is ready. Product, catalog, cart and checkout features can arrive here without changing the application shell.</p>
      <div class="welcome-actions">
        <a class="button button--dark" routerLink="/admin">Open admin boundary</a>
        <a class="button button--quiet" href="/api/v1/health" target="_blank" rel="noreferrer">Check API health</a>
      </div>
    </section>

    <section class="foundation-grid" aria-label="Foundation capabilities">
      <article><span class="card-index">01</span><h2>Feature boundaries</h2><p>Lazy routes isolate work by domain and keep the first load focused.</p></article>
      <article><span class="card-index">02</span><h2>Cookie auth ready</h2><p>HTTP credentials and CSRF token plumbing live in core, outside feature code.</p></article>
      <article><span class="card-index">03</span><h2>Signals at the edge</h2><p>Facades expose state without making components own API details.</p></article>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .welcome { max-width: 850px; padding: clamp(2rem, 8vw, 7rem) 0 5rem; animation: rise-in 600ms ease both; }
    .eyebrow, .card-index { color: var(--green); font: 700 0.75rem/1 var(--mono-font); letter-spacing: 0.13em; text-transform: uppercase; }
    h1 { max-width: 780px; margin: 1.2rem 0; color: var(--ink); font: 700 clamp(3rem, 8vw, 7.5rem)/0.94 var(--display-font); letter-spacing: 0; }
    .lede { max-width: 600px; margin: 0; color: var(--muted); font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.7; }
    .welcome-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 2rem; }
    .button { display: inline-flex; align-items: center; min-height: 2.9rem; padding: 0.75rem 1rem; border: 1px solid var(--ink); font-weight: 700; text-decoration: none; }
    .button--dark { background: var(--ink); color: var(--paper); }
    .button--quiet { color: var(--ink); }
    .button:hover { transform: translateY(-2px); }
    .foundation-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); animation: rise-in 700ms 120ms ease both; }
    article { min-height: 190px; padding: 1.5rem; background: rgba(255, 255, 255, 0.42); }
    h2 { margin: 2rem 0 0.6rem; font: 700 1.4rem/1.1 var(--display-font); }
    article p { margin: 0; color: var(--muted); line-height: 1.6; }
    @media (max-width: 760px) { .foundation-grid { grid-template-columns: 1fr; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StorefrontHomePage {}
