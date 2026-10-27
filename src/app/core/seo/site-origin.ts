import { InjectionToken } from '@angular/core';

/**
 * The public address of the site (`https://shop.example.com`), set by the Node server while a page is rendered. Behind a proxy or a tunnel
 * the server renders a page at an internal address, so the address visitors use cannot be read from the request. In the browser nothing
 * provides it and the address of the page is used.
 */
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN');
