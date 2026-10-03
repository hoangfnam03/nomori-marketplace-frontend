import viJson from './vi.json';
import enJson from './en.json';

export const vi = viJson;
export const en = enJson;

// Build-time check: vi.json and en.json must contain exactly the same keys.
// A key missing from en.json fails the first element; a key missing from vi.json fails the second.
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export const translationKeyCheck: [Shape<typeof vi>, Shape<typeof en>] = [en, vi];
