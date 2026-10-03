import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  standalone: true,
  imports: [RouterLink, TranslocoDirective],
  styleUrls: ['../auth-page.scss'],
  template: `
    <div class="auth-page" *transloco="let t">
      <section>
        <div class="eyebrow">{{ t('auth.forbidden.eyebrow') }}</div>
        <h1>{{ t('auth.forbidden.title') }}</h1>
        <p class="lede">{{ t('auth.forbidden.lede') }}</p>
      </section>
      <section class="auth-panel">
        <h2>{{ t('auth.forbidden.heading') }}</h2>
        <p class="lede">{{ t('auth.forbidden.text') }}</p>
        <div class="auth-links"><a routerLink="/storefront">{{ t('auth.links.backToStorefront') }}</a></div>
      </section>
    </div>
  `
})
export class ForbiddenPage {}
