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

describe('CartPage selection', () => {
  const line = (id: number, vendorId: number, issues: CartLine['issues'] = []): CartLine => ({
    id, productId: id, name: `P${id}`, vendorId, vendorName: `Shop ${vendorId}`, mainPictureId: 0, variantLabel: null, sku: null,
    quantity: 1, unitPrice: 5, comparePrice: null, lineTotal: 5, appliedRule: 'base', availableQuantity: null, previousUnitPrice: null, issues
  });
  const view = (lines: CartLine[]): CartView => ({
    currencyCode: 'USD', subtotal: lines.length * 5, itemCount: lines.length, canCheckout: true,
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
    fixture.detectChanges();
    return { page: fixture.componentInstance, navigate };
  }

  it('selects everything at first and checks out only the chosen lines', async () => {
    const { page, navigate } = await render([line(1, 10), line(2, 10), line(3, 20)]);

    expect(page.allSelected()).toBeTrue();
    page.toggleGroup(page.view!.groups[0]);
    expect([...page.selected]).toEqual([3]);
    expect(page.selectedSubtotal()).toBe(5);

    page.checkout();
    expect(navigate).toHaveBeenCalledWith(['/checkout'], { queryParams: { items: '3' } });
  });

  it('cannot check out a selection with an item that cannot be bought, unless it is unselected', async () => {
    const { page, navigate } = await render([line(1, 10), line(2, 10, ['out_of_stock'])]);

    expect(page.canCheckout()).toBeFalse();
    page.checkout();
    expect(navigate).not.toHaveBeenCalled();

    page.toggleLine(page.view!.groups[0].lines[1]);
    expect(page.canCheckout()).toBeTrue();
  });
});
