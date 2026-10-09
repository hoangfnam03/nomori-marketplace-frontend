import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CartService } from '../../core/cart/cart.service';
import { CheckoutApiService } from '../../core/checkout/checkout-api.service';
import { CheckoutChoices, CheckoutPreview, PlaceOrderRequest } from '../../core/checkout/checkout.models';
import { API_BASE_URL } from '../../core/config/api-config';
import { CustomerAccountDataApiService } from '../../core/customer/customer-account-data-api.service';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { CheckoutPage } from './checkout.page';

describe('CheckoutPage: buying the chosen lines', () => {
  const preview: CheckoutPreview = {
    cart: { currencyCode: 'USD', groups: [], subtotal: 20, itemCount: 2, canCheckout: true },
    addressId: 3, shops: [{ vendorId: 5, vendorName: 'Shop', subtotal: 20, options: [{ rateId: 1, name: 'Standard', fee: 2, isFree: false, minDays: null, maxDays: null }], chosenRateId: 1, shippingFee: 2 }],
    paymentMethods: [{ systemName: 'cod', displayName: 'COD', isOffline: true, redirects: false }], paymentMethod: 'cod',
    subtotal: 20, shippingTotal: 2, total: 22, problems: [], canPlace: true, discount: null, couponReason: null, tax: null
  } as CheckoutPreview;

  async function render(items: string | null) {
    const previews: CheckoutChoices[] = [];
    const placed: PlaceOrderRequest[] = [];
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
          provide: CheckoutApiService,
          useValue: {
            preview: (choices: CheckoutChoices) => { previews.push(choices); return of(preview); },
            place: (request: PlaceOrderRequest) => { placed.push(request); return of({ orderId: 9 }); }
          }
        },
        { provide: CustomerAccountDataApiService, useValue: { addresses: () => of([{ id: 3, isDefault: true }]) } },
        { provide: CartService, useValue: { refreshCount: () => undefined } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const page = TestBed.createComponent(CheckoutPage).componentInstance;
    page.ngOnInit();
    return { page, previews, placed };
  }

  it('sends the lines chosen in the cart with the preview and the order', async () => {
    const { page, previews, placed } = await render('11,12');

    expect(previews.every(p => p.cartItemIds?.join(',') === '11,12')).toBeTrue();
    page.acceptedTerms = true;
    page.place();

    expect(placed[0].cartItemIds).toEqual([11, 12]);
  });

  it('buys the whole cart when nothing was chosen', async () => {
    const { previews } = await render(null);

    expect(previews[0].cartItemIds).toBeNull();
  });
});
