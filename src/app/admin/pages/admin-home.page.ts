import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <section class="admin-intro" aria-labelledby="admin-title">
      <div>
        <div class="eyebrow">Admin / Foundation</div>
        <h1 id="admin-title">The operational side starts here.</h1>
        <p>Future back-office modules can register their own routes, permissions and data-access facades inside this lazy boundary.</p>
      </div>
      <div class="status-card"><span class="status-label">Boundary status</span><strong>Ready for modules</strong><span>Route and shell are online.</span></div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .admin-intro { display: grid; grid-template-columns: 1fr 300px; gap: clamp(2rem, 8vw, 8rem); align-items: end; min-height: 60vh; animation: rise-in 600ms ease both; }
    .eyebrow, .status-label { color: var(--green); font: 700 0.75rem/1 var(--mono-font); letter-spacing: 0.13em; text-transform: uppercase; }
    h1 { max-width: 700px; margin: 1.2rem 0; font: 700 clamp(3rem, 7vw, 7rem)/0.94 var(--display-font); }
    p { max-width: 560px; color: var(--muted); font-size: 1.1rem; line-height: 1.7; }
    .status-card { display: grid; gap: 0.7rem; padding: 1.4rem; border: 1px solid var(--line-strong); background: var(--ink); color: var(--paper); }
    .status-card strong { font: 700 1.5rem/1.1 var(--display-font); }
    .status-card span:last-child { color: #b4b8ae; font-size: 0.85rem; }
    @media (max-width: 760px) { .admin-intro { grid-template-columns: 1fr; align-items: start; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminHomePage {}
