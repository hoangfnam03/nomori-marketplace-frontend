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
  const guest: AuthSession = { isAuthenticated: false, customerId: null, email: null, emailVerified: null, emailOtpEnabled: null, vendorId: null, firstName: null, lastName: null, avatarPictureId: null };

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
    const trigger = element.querySelector<HTMLButtonElement>('.account-trigger');
    // The account links live in the menu behind the display name.
    trigger?.click();
    fixture.detectChanges();
    return Object.assign(hrefs('.primary-nav'), { account: hrefs('.account-status'), menu: hrefs('.account-panel'), fixture, element, trigger });
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
    // It stays on the header, not inside the account menu.
    expect(links.menu).not.toContain('/customer/become-vendor');
  });

  it('keeps profile and sign out in a menu that opens from the display name', async () => {
    const { fixture, element, trigger } = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test' }, 'forbidden');
    const panel = () => element.querySelector('.account-panel');

    // render() opened it once; close it with a second click.
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(panel()?.textContent).toContain('Đăng xuất');
    trigger!.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    trigger!.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();

    trigger!.click();
    fixture.detectChanges();
    element.querySelector('.account-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('links the account menu to the real orders page', async () => {
    const links = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test' }, 'forbidden');

    expect(links.menu).toEqual(['/auth/account', '/customer/profile', '/customer/orders']);
    expect(links.element.querySelector('.account-panel [aria-disabled="true"]')).toBeNull();
  });

  it('shows the name instead of the email when the profile has one', async () => {
    const { element } = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test', firstName: 'An', lastName: 'Nguyễn' }, 'forbidden');
    const name = element.querySelector('.account-trigger .account-email');

    expect(name?.textContent?.trim()).toBe('Nguyễn An');
    expect(name?.getAttribute('title')).toBe('buyer@test');
  });

  it('shows the default avatar until the user has one, then their picture', async () => {
    const withoutAvatar = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test' }, 'forbidden');
    expect(withoutAvatar.element.querySelector('.account-trigger app-avatar svg')).not.toBeNull();
    expect(withoutAvatar.element.querySelector('.account-trigger app-avatar img')).toBeNull();
    TestBed.resetTestingModule();

    const withAvatar = await render({ ...guest, isAuthenticated: true, customerId: 5, email: 'buyer@test', avatarPictureId: 42 }, 'forbidden');
    expect(withAvatar.element.querySelector('.account-trigger app-avatar img')?.getAttribute('src')).toBe('/api/v1/media/42');
  });

  it('shows storefront links only to guests', async () => {
    const links = await render(guest, []);

    expect([...links]).toEqual(['/storefront', '/storefront/products', '/storefront/cart', '/storefront/vendors']);
  });
});
