import { historyLine } from './order-history';
import { StoreOrderEvent } from './order.models';

describe('historyLine', () => {
  // Shows the key and the actor, so the tests read the choice of wording rather than a language.
  const t = (key: string, params?: Record<string, unknown>) => (params?.['actor'] ? `${key}(${params['actor']})` : key);
  const event = (patch: Partial<StoreOrderEvent>): StoreOrderEvent =>
    ({ fromStatus: null, toStatus: 'pending', actor: 'customer', reason: null, note: null, createdOnUtc: '', ...patch });

  it('names the customer "you" for the buyer and "the customer" for the shop', () => {
    expect(historyLine(event({}), 'customer', t)).toBe('orders.event.pending(orders.actor.customer)');
    expect(historyLine(event({}), 'vendor', t)).toBe('orders.event.pending(vendor.orders.actor.customer)');
  });

  it('shows the shop which member acted, but never shows the buyer a name', () => {
    const confirmed = event({ toStatus: 'confirmed', actor: 'vendor', actorName: 'Lan' });
    expect(historyLine(confirmed, 'vendor', t)).toBe('orders.event.confirmed(Lan)');
    expect(historyLine(confirmed, 'customer', t)).toBe('orders.event.confirmed(orders.actor.vendor)');
  });

  it('words "delivered" by who did it', () => {
    expect(historyLine(event({ toStatus: 'delivered', actor: 'customer' }), 'vendor', t)).toContain('deliveredBy.customer');
    expect(historyLine(event({ toStatus: 'delivered', actor: 'vendor' }), 'customer', t)).toContain('deliveredBy.vendor');
    expect(historyLine(event({ toStatus: 'delivered', actor: 'system' }), 'customer', t)).toContain('deliveredBy.system');
  });

  it('adds the reason of a cancellation, and words an automatic one apart', () => {
    expect(historyLine(event({ toStatus: 'cancelled', actor: 'vendor', reason: 'out_of_stock' }), 'customer', t))
      .toBe('orders.event.cancelled(orders.actor.vendor) — orders.cancelReason.out_of_stock');
    expect(historyLine(event({ toStatus: 'cancelled', actor: 'system', reason: 'not_confirmed_in_time' }), 'vendor', t))
      .toBe('orders.event.autoCancelled(vendor.orders.actor.system) — orders.cancelReason.not_confirmed_in_time');
    expect(historyLine(event({ toStatus: 'shipped', actor: 'vendor', reason: 'tracking_updated', note: 'GHN 1' }), 'customer', t))
      .toBe('orders.event.trackingUpdated(orders.actor.vendor)');
  });
});
