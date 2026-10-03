import { ApplicationInitStatus, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { AuthSession } from '../../core/auth/auth.models';
import { CartService } from '../../core/cart/cart.service';
import { API_BASE_URL } from '../../core/config/api-config';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent navigation', () => {
  const guest: AuthSession = { isAuthenticated: false, customerId: null, email: null, emailVerified: null, emailOtpEnabled: null, vendorId: null };

  async function render(session: AuthSession, permissions: string[] | 'forbidden') {
    const state = signal(session);
    const auth = {
      session: state.asReadonly(),
      isAuthenticated: computed(() => state().isAuthenticated),
      loadSession: () => of(state()),
      refreshSession: () => undefined,
      getPermissions: () => permissions === 'forbidden'
        ? throwError(() => ({ status: 403 }))
        : of({ permissions }),
      logout: () => of(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: AuthFacade, useValue: auth },
        { provide: CartService, useValue: { count: signal(0), refreshCount: () => undefined } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    // Permissions arrive from an effect after the first render.
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const hrefs = (selector: string) => Array.from(element.querySelectorAll(`${selector} a`), a => a.getAttribute('href'));
    return Object.assign(hrefs('.primary-nav'), { account: hrefs('.account-status') });
  }

  it('shows the vendor portal to shop members and hides admin links without permissions', async () => {
    const links = await render({ ...guest, isAuthenticated: true, customerId: 2, email: 'shop@test', vendorId: 3 }, 'forbidden');

    expect(links).toContain('/vendor');
    expect(links.some(href => href?.startsWith('/admin'))).toBeFalse();
  });

  it('shows only the admin links the permissions allow', async () => {
    const links = await render({ ...guest, isAuthenticated: true, customerId: 1, email: 'admin@test' }, ['admin.access', 'vendor.manage']);

    expect(links).toContain('/admin');
    expect(links).toContain('/admin/vendors');
    expect(links).toContain('/admin/vendor-applications');
    expect(links).not.toContain('/admin/catalog');
    expect(links).not.toContain('/admin/currencies');
    expect(links).not.toContain('/vendor');
    expect(links.account).not.toContain('/customer/become-vendor');
  });

  it('offers to become a vendor to customers without a shop', async () => {
    const links = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test' }, 'forbidden');

    expect(links.account).toContain('/customer/become-vendor');
  });

  it('shows storefront links only to guests', async () => {
    const links = await render(guest, []);

    expect([...links]).toEqual(['/storefront', '/storefront/products', '/storefront/cart', '/storefront/vendors']);
  });
});
