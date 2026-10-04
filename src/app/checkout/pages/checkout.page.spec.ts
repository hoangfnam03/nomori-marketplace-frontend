import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { CartService } from '../../core/cart/cart.service';
import { CartLine } from '../../core/cart/cart.models';
import { API_BASE_URL } from '../../core/config/api-config';
import { CustomerAccountDataApiService, CustomerAddress } from '../../core/customer/customer-account-data-api.service';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { OrderApiService } from '../../core/orders/order-api.service';
import { CheckoutPreview, Order, PlaceOrderRequest } from '../../core/orders/order.models';
import { CheckoutPage } from './checkout.page';

describe('CheckoutPage', () => {
  const line: CartLine = {
    id: 11, productId: 1, name: 'Mug', vendorId: 5, vendorName: 'Shop', mainPictureId: 0, variantLabel: null, sku: null,
    quantity: 2, unitPrice: 4, comparePrice: null, lineTotal: 8, appliedRule: 'base', availableQuantity: 10, previousUnitPrice: null, issues: []
  };
  const preview = (total = 9): CheckoutPreview => ({
    currencyCode: 'USD', groups: [{ vendorId: 5, vendorName: 'Shop', lines: [line], itemsTotal: 8, shippingFee: total - 8, total }],
    itemsTotal: 8, shippingTotal: total - 8, total, canPlace: true, missingCartItemIds: [], ownShopCartItemIds: []
  });
  const address: CustomerAddress = {
    id: 3, firstName: 'An', lastName: 'Nguyen', address1: '1 Pho Hue', city: 'Hanoi', countryCode: 'VN', phoneNumber: '0900', isDefault: true
  };

  async function render(items: string | null, placeResults: Observable<Order>[]) {
    const placed: { body: PlaceOrderRequest; key: string }[] = [];
    const previews = [preview(9), preview(10)];
    let previewCalls = 0;
    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(items ? { items } : {}) } } },
        {
          provide: OrderApiService,
          useValue: {
            preview: () => of(previews[Math.min(previewCalls++, previews.length - 1)]),
            place: (body: PlaceOrderRequest, key: string) => { placed.push({ body, key }); return placeResults.shift()!; }
          }
        },
        { provide: CustomerAccountDataApiService, useValue: { addresses: () => of([address]) } },
        { provide: CartService, useValue: { refreshCount: () => undefined } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    return { page: fixture.componentInstance, placed, navigate, previewCalls: () => previewCalls };
  }

  it('sends the cart lines, the chosen address and the total it showed, then opens the success page', async () => {
    const { page, placed, navigate } = await render('11', [of({ id: 42 } as Order)]);

    expect(page.addressId).toBe(3);
    page.notes[5] = '  ring twice  ';
    page.place();

    expect(placed[0].body).toEqual({ cartItemIds: [11], addressId: 3, paymentMethod: 'cashOnDelivery', notes: { 5: 'ring twice' }, expectedTotal: 9 });
    expect(placed[0].key.length).toBeGreaterThan(0);
    expect(navigate).toHaveBeenCalledWith(['/checkout/success', 42]);
  });

  it('shows the new total when the server refuses a stale one, and uses a new key next time', async () => {
    const { page, placed, previewCalls } = await render('11', [
      throwError(() => ({ status: 409, message: 'order.total_changed' })),
      of({ id: 43 } as Order)
    ]);

    page.place();
    expect(previewCalls()).toBe(2);
    expect(page.preview!.total).toBe(10);
    expect(page.notice).not.toBe('');

    page.place();
    expect(placed[1].body.expectedTotal).toBe(10);
    expect(placed[1].key).not.toBe(placed[0].key);
  });

  it('keeps the same key after a network error, so a retry cannot create a second order', async () => {
    const { page, placed } = await render('11', [throwError(() => ({ status: 0 })), of({ id: 44 } as Order)]);

    page.place();
    page.place();

    expect(placed[1].key).toBe(placed[0].key);
  });

  it('goes back to the cart when no items were chosen', async () => {
    const { navigate } = await render(null, []);

    expect(navigate).toHaveBeenCalledWith(['/storefront/cart']);
  });
});
