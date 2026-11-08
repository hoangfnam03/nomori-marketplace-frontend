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
    cart: {
      currencyCode: 'USD', subtotal: 20, itemCount: 2, canCheckout: true,
      groups: [{ vendorId: 5, vendorName: 'Shop', subtotal: 20, lines: [{ id: 11, productId: 1, name: 'Mug', vendorId: 5, vendorName: 'Shop', mainPictureId: 0, variantLabel: null, sku: null, quantity: 2, unitPrice: 10, comparePrice: null, lineTotal: 20, appliedRule: 'base', availableQuantity: null, previousUnitPrice: null, issues: [] }] }]
    } as unknown as CheckoutPreview['cart'],
    addressId: 3, shops: [{ vendorId: 5, vendorName: 'Shop', subtotal: 20, options: [{ rateId: 1, name: 'Standard', fee: 2, isFree: false, minDays: null, maxDays: null }], chosenRateId: 1, shippingFee: 2 }],
    paymentMethods: [{ systemName: 'cod', displayName: 'COD', isOffline: true, redirects: false }], paymentMethod: 'cod',
    subtotal: 20, shippingTotal: 2, total: 22, problems: [], canPlace: true, discount: null, couponReason: null, tax: null,
    shippingDiscount: null, shippingCouponReason: null,
    coupons: [
      { code: 'ALL10', name: 'All', funding: 'platform', vendorId: null, type: 'percentage', kind: 'product', value: 10, maxDiscountAmount: null, minSubtotal: null, startsOnUtc: null, endsOnUtc: null, amount: 2, reason: null, shortfall: null },
      { code: 'BIG', name: 'Big', funding: 'shop', vendorId: 5, type: 'fixed', kind: 'product', value: 5, maxDiscountAmount: null, minSubtotal: 50, startsOnUtc: null, endsOnUtc: null, amount: null, reason: 'min_subtotal', shortfall: 30 },
      { code: 'FREESHIP', name: 'Free shipping', funding: 'platform', vendorId: null, type: 'percentage', kind: 'shipping', value: 100, maxDiscountAmount: null, minSubtotal: null, startsOnUtc: null, endsOnUtc: null, amount: 2, reason: null, shortfall: null }
    ]
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
    const fixture = TestBed.createComponent(CheckoutPage);
    const page = fixture.componentInstance;
    page.ngOnInit();
    return { page, previews, placed, fixture };
  }

  it('sends the lines chosen in the cart with the preview and the order', async () => {
    const { page, previews, placed } = await render('11,12');

    expect(previews.every(p => p.cartItemIds?.join(',') === '11,12')).toBeTrue();
    page.acceptedTerms = true;
    page.place();

    expect(placed[0].cartItemIds).toEqual([11, 12]);
  });

  it('ticks one usable code, disables the others, and uses it only on "Use code"', async () => {
    const { page, previews } = await render(null);
    const [all10, big] = preview.coupons;
    const extra = { ...all10, code: 'MORE' };

    page.tick(big);
    expect(page.pendingCode).toBeNull();

    page.tick(all10);
    expect(page.pendingCode).toBe('ALL10');
    expect(page.canTick(extra)).toBeFalse();
    expect(previews.at(-1)!.couponCode).toBeNull();

    page.useCode();
    expect(previews.at(-1)!.couponCode).toBe('ALL10');
    expect(page.offerSummary(all10)).toContain('10');

    // Unticking and using takes the code off.
    page.tick(all10);
    expect(page.pendingCode).toBeNull();
    expect(page.canTick(extra)).toBeTrue();
    page.useCode();
    expect(previews.at(-1)!.couponCode).toBeNull();
  });

  it('lists every code and disables the ones that cannot be used, saying what is missing', async () => {
    const { fixture } = await render(null);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const radios = Array.from(element.querySelectorAll('.offer input[type=radio]')) as HTMLInputElement[];
    expect(Array.from(element.querySelectorAll('.offer-code')).map(c => c.textContent!.trim())).toEqual(['FREESHIP', 'ALL10', 'BIG']);
    expect(radios.map(r => r.disabled)).toEqual([false, false, true]);
    expect(element.querySelectorAll('.offer')[2].querySelector('.offer-reason')).not.toBeNull();

    // The summary only shows a button; the list opens in a dialog, a radio ticks a code and "Use code" applies it and closes.
    const dialog = element.querySelector('dialog.coupon-dialog') as HTMLDialogElement;
    expect(dialog.open).toBeFalse();
    (element.querySelector('button.offers-open') as HTMLButtonElement).click();
    expect(dialog.open).toBeTrue();
    radios[1].click();
    fixture.detectChanges();
    expect(radios[1].checked).toBeTrue();
    (element.querySelector('button.use-code') as HTMLButtonElement).click();
    expect(dialog.open).toBeFalse();
    expect(fixture.componentInstance.appliedCode).toBe('ALL10');
  });

  it('takes one shipping code and one item code together, each ticked in its own group', async () => {
    const { page, previews, placed } = await render(null);
    const [all10, , freeShip] = preview.coupons;

    page.openCoupons();
    page.tick(all10);
    // A shipping code is not blocked by the ticked item code.
    expect(page.canTick(freeShip)).toBeTrue();
    page.tick(freeShip);
    expect([page.pendingCode, page.pendingShippingCode]).toEqual(['ALL10', 'FREESHIP']);
    expect(page.offerGroups().map(g => [g.kind, g.offers.map(o => o.code)])).toEqual([['shipping', ['FREESHIP']], ['product', ['ALL10', 'BIG']]]);

    page.useCode();
    const last = previews[previews.length - 1];
    expect([last.couponCode, last.shippingCouponCode]).toEqual(['ALL10', 'FREESHIP']);

    page.acceptedTerms = true;
    page.place();
    expect([placed[0].couponCode, placed[0].shippingCouponCode]).toEqual(['ALL10', 'FREESHIP']);
  });

  it('asks for confirmation before placing the order, and places nothing when the customer goes back', async () => {
    const { fixture, placed } = await render(null);
    const page = fixture.componentInstance;
    page.acceptedTerms = true;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog.confirm-dialog') as HTMLDialogElement;
    expect(dialog.open).toBeFalse();

    page.openConfirm();
    expect(dialog.open).toBeTrue();
    expect(placed.length).toBe(0);

    page.closeConfirm();
    expect(dialog.open).toBeFalse();
    expect(placed.length).toBe(0);

    page.openConfirm();
    (element.querySelector('button.confirm-submit') as HTMLButtonElement).click();
    expect(dialog.open).toBeFalse();
    expect(placed.length).toBe(1);
  });

  it('buys the whole cart when nothing was chosen', async () => {
    const { previews } = await render(null);

    expect(previews[0].cartItemIds).toBeNull();
  });
});
