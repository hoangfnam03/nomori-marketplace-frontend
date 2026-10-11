/**
 * Public addresses carry the name and end with the id: `/storefront/products/white-vase-57`. The id decides what the page is; the slug
 * is made by the API (the `slug` field of products and shops) and only decorates the address. A key with an old slug, or just `57`,
 * still opens the page and is then replaced by the canonical one.
 */
export const PRODUCTS_PATH = '/storefront/products';
export const VENDORS_PATH = '/storefront/vendors';

/** The key of an address: `slug-id`, or just the id when there is no slug (or the caller does not have it). */
export function keyFor(id: number, slug?: string | null): string {
  return slug ? `${slug}-${id}` : String(id);
}

/** The id a key ends with, or null when the key is not valid (no id at the end, or other characters than letters, digits and dashes). */
export function parseKey(key: string | null | undefined): number | null {
  if (!key || key.length > 200 || !/^[A-Za-z0-9-]+$/.test(key)) return null;
  const tail = key.slice(key.lastIndexOf('-') + 1);
  if (!/^[0-9]{1,9}$/.test(tail)) return null;
  const id = Number(tail);
  return id > 0 ? id : null;
}

/** Router commands for a link to a product; works with only an id, and then the server redirects to the canonical address. */
export function productLink(id: number, slug?: string | null): string[] {
  return [PRODUCTS_PATH, keyFor(id, slug)];
}

export function vendorLink(id: number, slug?: string | null): string[] {
  return [VENDORS_PATH, keyFor(id, slug)];
}

/** The canonical path of a page, as a string. */
export function productPath(id: number, slug?: string | null): string { return productLink(id, slug).join('/'); }
export function vendorPath(id: number, slug?: string | null): string { return vendorLink(id, slug).join('/'); }

const BLOCK_TAGS = /<\/?(?:p|br|div|li|ul|ol|h[1-6]|tr|td|th|table)\b[^>]*>/gi;
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** Plain text for a description tag: tags removed (a block tag is a break between words), extra spaces gone, cut at a word with an ellipsis. */
export function describe(text: string | null | undefined, max = 160): string {
  if (!text?.trim()) return '';
  const plain = text.replace(BLOCK_TAGS, ' ').replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, entity => ENTITIES[entity]).replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max / 3 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
