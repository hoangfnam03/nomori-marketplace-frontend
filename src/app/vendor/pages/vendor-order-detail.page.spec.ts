import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../core/auth/auth.facade';
import { API_BASE_URL } from '../../core/config/api-config';
import { provideI18n } from '../../core/i18n/i18n.providers';
import { OrderApiService } from '../../core/orders/order-api.service';
import { Order, StoreOrder } from '../../core/orders/order.models';
import { VendorOrderDetailPage } from './vendor-order-detail.page';

describe('VendorOrderDetailPage', () => {
  const storeOrder = (patch: Partial<StoreOrder>): StoreOrder => ({
    id: 9, orderId: 4, orderNumber: 'NM261004-0001', subOrderNumber: 'NM261004-0001-1', vendorId: 2, vendorName: 'Shop',
    status: 'confirmed', paymentStatus: 'pending', itemsTotal: 8, shippingFee: 0, total: 8, customerNote: 'ring twice', carrier: null,
    trackingNumber: null, confirmByUtc: '2026-10-06T00:00:00Z', createdOnUtc: '2026-10-04T00:00:00Z', deliveredOnUtc: null, cancelledOnUtc: null,
    cancelReason: null, cancelNote: null, cancelledBy: null, canCancel: true, canConfirmReceipt: false, canReorder: false,
    canConfirm: false, canShip: true, canMarkDelivered: false, canEditShipment: false, recipientName: null, recipientPhone: null, itemCount: 2,
    items: [], events: [], ...patch
  });
  const order = (patch: Partial<StoreOrder> = {}): Order => ({
    id: 4, orderNumber: 'NM261004-0001', createdOnUtc: '', currencyCode: 'USD', itemsTotal: 8, shippingTotal: 0, total: 8,
    paymentMethod: 'cashOnDelivery', paymentStatus: 'pending', overallStatus: 'processing', canCancelAll: false,
    shippingAddress: { firstName: 'An', lastName: 'Nguyen', company: null, address1: '1 Pho Hue', address2: null, city: 'Hanoi', stateProvince: null, countryCode: 'VN', zipPostalCode: null, phoneNumber: '0900' },
    storeOrders: [storeOrder(patch)]
  });

  async function render(api: Partial<OrderApiService>) {
    await TestBed.configureTestingModule({
      imports: [VendorOrderDetailPage],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideI18n(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
        { provide: AuthFacade, useValue: { loadSession: () => of({ vendorId: 2 }) } },
        { provide: OrderApiService, useValue: { vendorGet: () => of(order()), ...api } }
      ]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
    const fixture = TestBed.createComponent(VendorOrderDetailPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ships with a carrier typed in after choosing "other"', async () => {
    const ship = jasmine.createSpy('ship').and.returnValue(of(order({ status: 'shipped', carrier: 'Local Express', trackingNumber: 'LE-1' })));
    const page = await render({ ship });

    page.openShipment('ship');
    page.carrier = 'other';
    page.carrierOther = '  Local Express ';
    expect(page.shipmentReady()).toBeFalse();
    page.trackingNumber = ' LE-1 ';
    page.submitShipment();

    expect(ship).toHaveBeenCalledWith(9, 'Local Express', 'LE-1');
    expect(page.storeOrder!.status).toBe('shipped');
    expect(page.panel).toBeNull();
  });

  it('keeps the form open with the field errors the API returns', async () => {
    const page = await render({ ship: () => throwError(() => ({ status: 400, fieldErrors: { trackingNumber: ['Enter the tracking number.'] } })) });

    page.openShipment('ship');
    page.carrier = 'GHN';
    page.trackingNumber = 'x';
    page.submitShipment();

    expect(page.panel).toBe('ship');
    expect(page.fieldErrors['trackingNumber']).toEqual(['Enter the tracking number.']);
  });

  it('reloads the order when the customer cancelled it first', async () => {
    const vendorGet = jasmine.createSpy('vendorGet').and.returnValues(of(order({ status: 'pending', canConfirm: true })), of(order({ status: 'cancelled', canCancel: false })));
    const page = await render({ vendorGet, confirm: () => throwError(() => ({ status: 409, message: 'store_order.concurrent_update' })) });

    page.confirm();

    expect(vendorGet).toHaveBeenCalledTimes(2);
    expect(page.storeOrder!.status).toBe('cancelled');
    expect(page.error).not.toBe('');
  });
});
