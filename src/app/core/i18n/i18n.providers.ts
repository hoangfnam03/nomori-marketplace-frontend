import { APP_INITIALIZER, Injectable, InjectionToken, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Translation, TranslocoLoader, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { en, vi } from '../../i18n/translations';

export type AppLang = 'vi' | 'en';

export const AVAILABLE_LANGS: readonly AppLang[] = ['vi', 'en'];
export const DEFAULT_LANG: AppLang = 'vi';
export const LANG_COOKIE = 'nomori_lang';
const LANG_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Provided by server.ts during SSR with the language read from the request cookie. */
export const REQUEST_LANG = new InjectionToken<AppLang>('REQUEST_LANG');

@Injectable({ providedIn: 'root' })
export class StaticTranslationLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of((lang === 'en' ? en : vi) as Translation);
  }
}

export function readLangCookie(cookieHeader: string | null | undefined): AppLang | null {
  const match = new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]*)`).exec(cookieHeader ?? '');
  const value = match?.[1];
  return value === 'vi' || value === 'en' ? value : null;
}

export function setLanguage(transloco: TranslocoService, document: Document, lang: AppLang): void {
  transloco.setActiveLang(lang);
  document.documentElement.lang = lang;
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function initLanguageFactory() {
  const transloco = inject(TranslocoService);
  const document = inject(DOCUMENT);
  const platformId = inject(PLATFORM_ID);
  const requestLang = inject(REQUEST_LANG, { optional: true });

  return () => {
    const lang = isPlatformBrowser(platformId)
      ? readLangCookie(document.cookie) ?? DEFAULT_LANG
      : requestLang ?? DEFAULT_LANG;

    transloco.setActiveLang(lang);
    document.documentElement.lang = lang;
    // Both languages are bundled, so register both up front: translate() then works right after a switch.
    return firstValueFrom(forkJoin(AVAILABLE_LANGS.map(available => transloco.load(available))));
  };
}

export function provideI18n() {
  return [
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: !isDevMode()
      },
      loader: StaticTranslationLoader
    }),
    { provide: APP_INITIALIZER, multi: true, useFactory: initLanguageFactory }
  ];
}
