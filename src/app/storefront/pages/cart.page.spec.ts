import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CartApiService } from '../../core/cart/cart-api.service';
import { CartLine, CartView } from '../../core/cart/cart.models';
import { CartService } from '../../core/cart/cart.service';
import { API_BASE_URL } from '../../core/config/api-config';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { CartPage } from './cart.page';

describe('CartPage: choosing what to buy', () => {
  const line = (id: number, vendorId: number, issues: CartLine['issues'] = []): CartLine => ({
    id, productId: id, name: `P${id}`, vendorId, vendorName: `Shop ${vendorId}`, mainPictureId: 0, variantLabel: null, sku: null,
    quantity: 1, unitPrice: 5, comparePrice: null, lineTotal: 5, appliedRule: 'base', availableQuantity: null, previousUnitPrice: null, issues
  } as CartLine);
  const view = (lines: CartLine[]): CartView => ({
    currencyCode: 'USD', subtotal: lines.length * 5, itemCount: lines.length, canCheckout: lines.every(l => l.issues.length === 0),
    groups: [...new Set(lines.map(l => l.vendorId))].map(v => ({ vendorId: v, vendorName: `Shop ${v}`, lines: lines.filter(l => l.vendorId === v), subtotal: 5 }))
  });

  async function render(lines: CartLine[]) {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: CartApiService, useValue: { get: () => of(view(lines)) } },
        { provide: CartService, useValue: { publish: () => undefined } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CartPage);
    fixture.componentInstance.load();
    return { page: fixture.componentInstance, navigate };
  }

  it('ticks nothing at first and checks out only the chosen lines', async () => {
    const { page, navigate } = await render([line(1, 10), line(2, 10), line(3, 20)]);

    expect(page.selected.size).toBe(0);
    expect(page.canCheckout()).toBeFalse();
    page.toggleGroup(page.view!.groups[1]);
    expect([...page.selected]).toEqual([3]);
    expect(page.selectedSubtotal()).toBe(5);

    page.checkout();
    expect(navigate).toHaveBeenCalledWith(['/storefront/checkout'], { queryParams: { items: '3' } });
  });

  it('lets the customer buy the other lines when one cannot be bought', async () => {
    const { page, navigate } = await render([line(1, 10), line(2, 10, ['out_of_stock'])]);

    page.toggleAll();
    expect(page.canCheckout()).toBeFalse();
    page.checkout();
    expect(navigate).not.toHaveBeenCalled();

    page.toggleLine(page.view!.groups[0].lines[1]);
    expect(page.canCheckout()).toBeTrue();
  });

  it('cannot check out with nothing ticked', async () => {
    const { page } = await render([line(1, 10)]);

    page.toggleAll();
    page.toggleAll();

    expect(page.selected.size).toBe(0);
    expect(page.canCheckout()).toBeFalse();
  });
});
