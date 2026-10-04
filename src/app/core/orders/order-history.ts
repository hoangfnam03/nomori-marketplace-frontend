import { KNOWN_REASONS, OrderActor, StoreOrderEvent } from './order.models';

/** Whose page the history is on: the same event reads "You placed the order" for the buyer and "The customer placed the order" for the shop. */
export type HistoryViewer = 'customer' | 'vendor';

type Translate = (key: string, params?: Record<string, unknown>) => string;

/** Who acted, as the viewer should read it. The shop also sees which of its members it was, when the API names them. */
export function actorLabel(actor: OrderActor, viewer: HistoryViewer, t: Translate, actorName?: string | null): string {
  if (viewer === 'vendor') return actor === 'vendor' && actorName ? actorName : t(`vendor.orders.actor.${actor}`);
  return t(`orders.actor.${actor}`);
}

/** A cancellation reason (or any other reason code) in words, with the note after it. */
export function reasonLabel(reason: string, note: string | null, t: Translate): string {
  const label = KNOWN_REASONS.includes(reason) ? t(`orders.cancelReason.${reason}`) : reason;
  return note ? `${label}: ${note}` : label;
}

/**
 * One line of an order's history. The wording depends on who acted as well as on the new status: "delivered" means
 * "confirmed receipt" when the customer did it, "marked as delivered" when the shop did, and "moved on automatically" for the system.
 */
export function historyLine(e: StoreOrderEvent, viewer: HistoryViewer, t: Translate): string {
  const actor = actorLabel(e.actor, viewer, t, e.actorName);
  let key: string;
  if (e.reason === 'tracking_updated') key = 'orders.event.trackingUpdated';
  else if (e.toStatus === 'delivered') key = `orders.event.deliveredBy.${e.actor}`;
  else if (e.toStatus === 'cancelled' && e.actor === 'system') key = 'orders.event.autoCancelled';
  else key = `orders.event.${e.toStatus}`;

  const line = t(key, { actor });
  const showReason = e.reason && e.reason !== 'tracking_updated';
  return showReason ? `${line} — ${reasonLabel(e.reason!, e.note, t)}` : line;
}
