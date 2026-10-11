/** The status of a tracking line, written by the shop. `info` is a free note. */
export type TrackingStatus = 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivery_attempted' | 'exception' | 'info';

export const TRACKING_STATUSES: TrackingStatus[] = ['picked_up', 'in_transit', 'out_for_delivery', 'delivery_attempted', 'exception', 'info'];

export interface TrackingEvent {
  id: number;
  status: TrackingStatus;
  location: string | null;
  note: string | null;
  occurredOnUtc: string;
}

/** The parcel of one shop order, newest event first. `trackingUrl` is the carrier's own page, when the carrier has one. */
export interface Tracking {
  shopOrderId: number;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  orderStatus: string;
  events: TrackingEvent[];
}

export interface NewTrackingEvent {
  status: TrackingStatus;
  location: string | null;
  note: string | null;
}

/** The pick list a shop sees when it ships. */
export interface CarrierName { id: number; name: string; }

/** A carrier as the administrator edits it. */
export interface Carrier {
  id: number;
  name: string;
  trackingUrlTemplate: string | null;
  active: boolean;
  displayOrder: number;
}

export interface SaveCarrier {
  name: string;
  trackingUrlTemplate: string | null;
  active: boolean;
  displayOrder: number;
}
