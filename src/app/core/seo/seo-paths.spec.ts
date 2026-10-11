import { describe as describeText, keyFor, parseKey, productLink, productPath, vendorPath } from './seo-paths';

describe('seo paths', () => {
  it('builds the key from the slug and the id, or from the id alone', () => {
    expect(keyFor(57, 'white-vase')).toBe('white-vase-57');
    expect(keyFor(57, '')).toBe('57');
    expect(keyFor(57)).toBe('57');
  });

  it('builds links and paths', () => {
    expect(productLink(57, 'white-vase')).toEqual(['/storefront/products', 'white-vase-57']);
    expect(productPath(57, 'white-vase')).toBe('/storefront/products/white-vase-57');
    expect(vendorPath(3, 'mugs-inc')).toBe('/storefront/vendors/mugs-inc-3');
    expect(productPath(9)).toBe('/storefront/products/9');
  });

  it('reads the id a key ends with', () => {
    expect(parseKey('57')).toBe(57);
    expect(parseKey('white-vase-57')).toBe(57);
    expect(parseKey('2024-vase-9')).toBe(9);
  });

  it('refuses keys without a valid id at the end or with other characters', () => {
    for (const key of [null, undefined, '', 'white-vase', 'white-vase-', '0', 'vase-0', 'vase-99999999999', 'vase-1.5', 'vase 57', 'a/b-5']) {
      expect(parseKey(key)).withContext(String(key)).toBeNull();
    }
    expect(parseKey('a'.repeat(250) + '-5')).toBeNull();
  });

  it('turns a description into plain text cut at a word', () => {
    expect(describeText('<p>Fine   ceramic <b>vase</b>.</p>\n<p>Hand made &amp; glazed.</p>')).toBe('Fine ceramic vase. Hand made & glazed.');
    expect(describeText(null)).toBe('');
    const long = describeText('lovely '.repeat(60));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith('…')).toBeTrue();
  });
});
