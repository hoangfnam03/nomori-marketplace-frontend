import { ApplicationInitStatus } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LANG_COOKIE, provideI18n, readLangCookie, setLanguage } from './i18n.providers';

function clearLangCookie() {
  document.cookie = `${LANG_COOKIE}=; Path=/; Max-Age=0`;
}

describe('readLangCookie', () => {
  it('reads a supported language from a cookie header', () => {
    expect(readLangCookie(`${LANG_COOKIE}=en`)).toBe('en');
    expect(readLangCookie(`other=1; ${LANG_COOKIE}=vi; last=2`)).toBe('vi');
  });

  it('ignores missing, unsupported and look-alike cookies', () => {
    expect(readLangCookie(undefined)).toBeNull();
    expect(readLangCookie('')).toBeNull();
    expect(readLangCookie(`${LANG_COOKIE}=fr`)).toBeNull();
    expect(readLangCookie(`x${LANG_COOKIE}=en`)).toBeNull();
  });
});

describe('provideI18n', () => {
  afterEach(clearLangCookie);

  async function setup() {
    TestBed.configureTestingModule({ providers: [provideI18n()] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    return TestBed.inject(TranslocoService);
  }

  it('starts in Vietnamese when there is no language cookie', async () => {
    clearLangCookie();
    const transloco = await setup();

    expect(transloco.getActiveLang()).toBe('vi');
    expect(transloco.translate('nav.storefront')).toBe('Cửa hàng');
    expect(document.documentElement.lang).toBe('vi');
  });

  it('starts in the language stored in the cookie', async () => {
    document.cookie = `${LANG_COOKIE}=en; Path=/`;
    const transloco = await setup();

    expect(transloco.getActiveLang()).toBe('en');
    expect(transloco.translate('nav.storefront')).toBe('Storefront');
  });

  it('setLanguage switches the language, updates <html lang> and stores the cookie', async () => {
    clearLangCookie();
    const transloco = await setup();

    setLanguage(transloco, TestBed.inject(DOCUMENT), 'en');

    expect(transloco.getActiveLang()).toBe('en');
    expect(transloco.translate('common.actions.save')).toBe('Save');
    expect(document.documentElement.lang).toBe('en');
    expect(readLangCookie(document.cookie)).toBe('en');
  });
});
