import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideI18n } from '../i18n/i18n.providers';
import { SITE_ORIGIN } from './site-origin';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let document: Document;

  const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content') ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideI18n()] });
    seo = TestBed.inject(SeoService);
    document = TestBed.inject(DOCUMENT);
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('script#nomori-jsonld')?.remove();
  });

  it('sets the title, description, canonical link and social tags with the address of the site', () => {
    seo.set({ title: 'White vase · Mugs Inc', description: 'Fine vase', path: '/storefront/products/white-vase-57', image: '/api/v1/media/5', type: 'product' });

    const origin = document.location.origin;
    expect(document.title).toBe('White vase · Mugs Inc · Nomori');
    expect(content('meta[name="description"]')).toBe('Fine vase');
    expect(content('meta[property="og:title"]')).toBe('White vase · Mugs Inc · Nomori');
    expect(content('meta[property="og:type"]')).toBe('product');
    expect(content('meta[property="og:url"]')).toBe(`${origin}/storefront/products/white-vase-57`);
    expect(content('meta[property="og:image"]')).toBe(`${origin}/api/v1/media/5`);
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/storefront/products/white-vase-57`);
  });

  it('does not repeat the site name and uses a small card without an image', () => {
    seo.set({ title: 'Nomori Marketplace', path: '/storefront' });

    expect(document.title).toBe('Nomori Marketplace');
    expect(content('meta[name="twitter:card"]')).toBe('summary');
    expect(content('meta[property="og:image"]')).toBeNull();
  });

  it('keeps a single canonical link and replaces it on the next page', () => {
    seo.set({ title: 'A', path: '/a' });
    seo.set({ title: 'B', path: '/b' });

    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toContain('/b');
  });

  it('writes the structured data safely and removes it on the next page', () => {
    seo.set({ title: 'A', path: '/a', jsonLd: { '@type': 'Product', name: '</script><b>x' } });

    const script = document.head.querySelector('script#nomori-jsonld');
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(script?.textContent).not.toContain('<');
    expect(JSON.parse(script?.textContent ?? '{}').name).toBe('</script><b>x');

    seo.set({ title: 'B', path: '/b' });
    expect(document.head.querySelector('script#nomori-jsonld')).toBeNull();
  });

  it('marks a page noindex and clears it on a public page', () => {
    seo.setPrivate('Cart');
    expect(content('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();

    seo.set({ title: 'Home', path: '/storefront' });
    expect(content('meta[name="robots"]')).toBeNull();
  });

  it('uses the public address given by the server instead of the address of the page it renders', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideI18n(), { provide: SITE_ORIGIN, useValue: 'https://shop.example.com/' }] });
    const configured = TestBed.inject(SeoService);
    const doc = TestBed.inject(DOCUMENT);

    configured.set({ title: 'A', path: '/storefront/products/a-1', image: '/api/v1/media/5' });

    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://shop.example.com/storefront/products/a-1');
    expect(doc.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://shop.example.com/api/v1/media/5');
  });
});
