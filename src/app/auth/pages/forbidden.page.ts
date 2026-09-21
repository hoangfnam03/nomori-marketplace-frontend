import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page">
      <section>
        <div class="eyebrow">Authorization / Forbidden</div>
        <h1>This boundary is restricted.</h1>
        <p class="lede">Your session is valid, but it does not include the permission required for this area.</p>
      </section>
      <section class="auth-panel">
        <h2>Access denied</h2>
        <p class="lede">Ask an administrator to update your role, or return to the storefront.</p>
        <div class="auth-links"><a routerLink="/storefront">Back to storefront</a></div>
      </section>
    </div>
  `
})
export class ForbiddenPage {}
