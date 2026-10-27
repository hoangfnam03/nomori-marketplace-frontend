import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, take } from 'rxjs';
import { SITE_ORIGIN } from './site-origin';

export const SITE_NAME = 'Nomori';

export interface PageMeta {
  title: string;
  description?: string;
  /** The canonical path, starting with `/`. The site address comes from the page being shown. */
  path: string;
  /** Absolute address, or a path (which gets the site address). */
  image?: string;
  type?: 'website' | 'product' | 'profile';
  /** Structured data (schema.org), written as a JSON-LD block. */
  jsonLd?: object | null;
  noindex?: boolean;
}

const JSON_LD_ID = 'nomori-jsonld';

/** Page title, description, canonical link, Open Graph, Twitter card and structured data. It also works during server rendering. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly configuredOrigin = inject(SITE_ORIGIN, { optional: true });

  /** The address of the site as the visitor (or the crawler) sees it. Empty when the page does not know it. */
  origin(): string {
    // The server knows the public address from its settings; the browser from the page itself.
    const origin = this.configuredOrigin?.replace(/\/$/, '') || this.document.location?.origin;
    return origin && origin !== 'null' ? origin : '';
  }

  absolute(pathOrUrl: string): string {
    return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : this.origin() + pathOrUrl;
  }

  set(page: PageMeta) {
    const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} · ${SITE_NAME}`;
    const url = this.absolute(page.path);
    const image = page.image ? this.absolute(page.image) : undefined;

    this.title.setTitle(fullTitle);
    this.tag('name', 'description', page.description);
    this.tag('name', 'robots', page.noindex ? 'noindex, nofollow' : undefined);
    this.tag('property', 'og:site_name', SITE_NAME);
    this.tag('property', 'og:type', page.type ?? 'website');
    this.tag('property', 'og:title', fullTitle);
    this.tag('property', 'og:description', page.description);
    this.tag('property', 'og:url', url);
    this.tag('property', 'og:image', image);
    this.tag('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    this.tag('name', 'twitter:title', fullTitle);
    this.tag('name', 'twitter:description', page.description);
    this.tag('name', 'twitter:image', image);
    this.canonical(url);
    this.jsonLd(page.jsonLd ?? null);
  }

  /** A page whose title and description are texts of the screens: waits until they are loaded, in the language of the visitor. */
  setByKeys(titleKey: string, descriptionKey: string, path: string) {
    combineLatest([this.transloco.selectTranslate(titleKey), this.transloco.selectTranslate(descriptionKey)])
      .pipe(take(1))
      .subscribe(([title, description]) => this.set({ title, description, path }));
  }

  /** Pages that must not be indexed (a signed-in area): title and the robots tag, no canonical link. */
  setPrivate(title: string) {
    this.title.setTitle(`${title} · ${SITE_NAME}`);
    this.tag('name', 'robots', 'noindex, nofollow');
    this.removeCanonical();
    this.jsonLd(null);
  }

  private tag(attribute: 'name' | 'property', key: string, content: string | undefined) {
    const selector = `${attribute}="${key}"`;
    if (content) this.meta.updateTag({ [attribute]: key, content }, selector);
    else this.meta.removeTag(selector);
  }

  private canonical(url: string) {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private removeCanonical() {
    this.document.head.querySelector('link[rel="canonical"]')?.remove();
  }

  private jsonLd(data: object | null) {
    const head = this.document.head;
    head.querySelector(`script#${JSON_LD_ID}`)?.remove();
    if (!data) return;
    const script = this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', JSON_LD_ID);
    // "<" cannot appear in the block, so a name can never close the script tag.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    head.appendChild(script);
  }
}
