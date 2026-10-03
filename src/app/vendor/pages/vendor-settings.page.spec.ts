import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { API_BASE_URL } from '../../core/config/api-config';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { UpdateVendorRequest, VendorApiService } from '../../core/vendors/vendor-api.service';
import { VendorResponse } from '../../core/vendors/vendor.models';
import { VendorSettingsPage } from './vendor-settings.page';

describe('VendorSettingsPage', () => {
  const shop: VendorResponse = {
    id: 3, name: 'meo meo shop', email: 'meo@example.com', description: 'hello', pictureId: 7, displayOrder: 0,
    active: true, addressId: 0, createdOnUtc: '2026-10-03T06:32:34Z', updatedOnUtc: null, adminComment: null,
    phoneNumber: '0901234567', taxCode: '123', businessAddress: 'Hanoi'
  };

  async function render(vendor: VendorResponse, update: (body: UpdateVendorRequest) => ReturnType<VendorApiService['updateVendor']>) {
    const sent: UpdateVendorRequest[] = [];
    await TestBed.configureTestingModule({
      imports: [VendorSettingsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: AuthFacade, useValue: { refreshSession: () => undefined, loadSession: () => of({ vendorId: vendor.id }) } },
        {
          provide: VendorApiService,
          useValue: {
            getVendor: () => of(vendor),
            updateVendor: (_id: number, body: UpdateVendorRequest) => { sent.push(body); return update(body); }
          }
        }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;

    const fixture = TestBed.createComponent(VendorSettingsPage);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, sent, element: fixture.nativeElement as HTMLElement };
  }

  it('fills the form and sends only the shop profile fields', async () => {
    const { page, sent } = await render(shop, body => of({ ...shop, name: body.name }));

    expect(page.form.phoneNumber).toBe('0901234567');
    page.form.name = 'Meo Shop';
    page.save();

    expect(sent.length).toBe(1);
    expect(sent[0]).toEqual({
      name: 'Meo Shop', email: 'meo@example.com', phoneNumber: '0901234567', description: 'hello',
      taxCode: '123', businessAddress: 'Hanoi', pictureId: 7
    });
    expect(page.saved).toBeTrue();
    expect(page.vendor?.name).toBe('Meo Shop');
  });

  it('requires name, email and phone before calling the API', async () => {
    const { page, sent } = await render(shop, () => of(shop));

    page.form.phoneNumber = '  ';
    page.save();

    expect(sent.length).toBe(0);
    expect(page.fieldError('phoneNumber')).not.toBe('');
  });

  it('shows field errors from the API next to the fields', async () => {
    const { page } = await render(shop, () => throwError(() => ({ status: 400, fieldErrors: { name: ['Another shop already uses this name.'] } })));

    page.save();

    expect(page.fieldError('name')).toBe('Another shop already uses this name.');
    expect(page.saved).toBeFalse();
  });

  it('does not let members edit a shop an administrator switched off', async () => {
    const { page, sent, element } = await render({ ...shop, active: false }, () => of(shop));

    expect(page.locked).toBeTrue();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBeTrue();
    page.save();
    expect(sent.length).toBe(0);
  });
});
