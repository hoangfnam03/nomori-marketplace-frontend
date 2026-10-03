import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { API_BASE_URL } from './core/config/api-config';
import { environment } from '../environments/environment';
import { correlationInterceptor } from './core/http/correlation.interceptor';
import { csrfInterceptor } from './core/http/csrf.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { provideI18n } from './core/i18n/i18n.providers';

// Dates, numbers and money use one fixed format in both UI languages (see docs/i18n-design.md, section 7).
registerLocaleData(localeVi);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([correlationInterceptor, csrfInterceptor, errorInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: LOCALE_ID, useValue: 'vi' },
    provideI18n(),
    provideClientHydration()
  ]
};
