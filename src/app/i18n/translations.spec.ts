import { en, vi } from './translations';

type TranslationTree = { [key: string]: string | TranslationTree };

function flatten(tree: TranslationTree, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.set(path, value);
    } else {
      flatten(value, path).forEach((text, nested) => result.set(nested, text));
    }
  }
  return result;
}

describe('translations', () => {
  const viKeys = flatten(vi);
  const enKeys = flatten(en);

  it('vi.json and en.json declare the same keys', () => {
    expect([...viKeys.keys()].filter(key => !enKeys.has(key))).withContext('missing in en.json').toEqual([]);
    expect([...enKeys.keys()].filter(key => !viKeys.has(key))).withContext('missing in vi.json').toEqual([]);
  });

  it('has no empty texts', () => {
    const empty = [...viKeys, ...enKeys].filter(([, text]) => text.trim() === '').map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
