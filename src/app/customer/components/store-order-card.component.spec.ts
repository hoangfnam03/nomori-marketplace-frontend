import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CartService } from '../../core/cart/cart.service';
import { API_BASE_URL } from '../../core/config/api-config';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { OrderApiService } from '../../core/orders/order-api.service';
import { Order, StoreOrder } from '../../core/orders/order.models';
import { StoreOrderCardComponent } from './store-order-card.component';

describe('StoreOrderCardComponent', () => {
  const storeOrder: StoreOrder = {
    id: 9, orderId: 4, orderNumber: 'NM261004-0001', subOrderNumber: 'NM261004-0001-1', vendorId: 5, vendorName: 'Shop',
    status: 'pending', paymentStatus: 'pending', itemsTotal: 8, shippingFee: 0, total: 8, customerNote: null, carrier: null,
    trackingNumber: null, confirmByUtc: '', createdOnUtc: '2026-10-04T00:00:00Z', deliveredOnUtc: null, cancelledOnUtc: null,
    cancelReason: null, cancelNote: null, cancelledBy: null, canCancel: true, canConfirmReceipt: false, canReorder: false,
    canConfirm: false, canShip: false, canMarkDelivered: false, canEditShipment: false, recipientName: null, recipientPhone: null, itemCount: 2,
    items: [{ id: 1, productId: 1, productName: 'Mug', variantDescription: null, sku: null, pictureId: 0, unitPrice: 4, quantity: 2, lineTotal: 8 }],
    events: []
  };
  const cancelledOrder = { id: 4, storeOrders: [{ ...storeOrder, status: 'cancelled', canCancel: false }] } as Order;

  async function render(api: Partial<OrderApiService>) {
    await TestBed.configureTestingModule({
      imports: [StoreOrderCardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: OrderApiService, useValue: api },
        { provide: CartService, useValue: { count: { set: () => undefined } } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const fixture = TestBed.createComponent(StoreOrderCardComponent);
    fixture.componentInstance.storeOrder = storeOrder;
    fixture.detectChanges();
    const emitted: Order[] = [];
    fixture.componentInstance.changed.subscribe(o => emitted.push(o));
    return { card: fixture.componentInstance, emitted };
  }

  it('cancels with the chosen reason and hands back the updated order', async () => {
    const cancel = jasmine.createSpy('cancel').and.returnValue(of(cancelledOrder));
    const { card, emitted } = await render({ cancel });

    card.cancelling = true;
    card.reason = 'other';
    card.note = '  wrong size  ';
    card.confirmCancel();

    expect(cancel).toHaveBeenCalledWith(9, 'other', 'wrong size');
    expect(emitted).toEqual([cancelledOrder]);
    expect(card.cancelling).toBeFalse();
  });

  it('reloads the order when the shop changed it first', async () => {
    const get = jasmine.createSpy('get').and.returnValue(of(cancelledOrder));
    const { card, emitted } = await render({
      cancel: () => throwError(() => ({ status: 409, message: 'store_order.concurrent_update' })),
      get
    });

    card.reason = 'changed_mind';
    card.confirmCancel();

    expect(get).toHaveBeenCalledWith(4);
    expect(emitted).toEqual([cancelledOrder]);
    expect(card.error).not.toBe('');
  });
});
