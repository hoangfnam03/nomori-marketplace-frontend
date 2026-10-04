import { translate } from '@jsverse/transloco';

/** Business-rule codes returned by the API in ProblemDetails.detail (HTTP 409). Each one has the key errors.<code>. */
const codes = new Set([
  'vendor_application.email_not_verified', 'vendor_application.already_vendor', 'vendor_application.already_pending',
  'vendor_application.not_pending', 'vendor_application.applicant_already_vendor', 'vendor_member.email_already_exists',
  'vendor_member.limit_reached', 'vendor_member.already_active', 'vendor_member.last_member', 'product.hidden_by_admin',
  'product.not_hidden', 'product.already_hidden', 'product.invalid_transition', 'inventory.insufficient_stock',
  'inventory.reservation_expired', 'inventory.active_reservations', 'currency.primary_locked', 'currency.primary_required',
  'currency.code_exists', 'cart.own_product', 'cart.line_limit', 'country.code_exists', 'country.in_use', 'state.code_exists',
  'state.in_use', 'vendor.platform_shop', 'vendor.inactive', 'order.total_changed', 'order.items_unavailable',
  'order.cart_item_not_found', 'order.address_invalid', 'store_order.invalid_transition', 'store_order.concurrent_update'
]);

export interface ApiError {
  status?: number;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Turns an error normalised by the error interceptor into a message a person can read. */
export function vendorErrorMessage(error: ApiError, fallback: string): string {
  if (error.status === 409 && error.message && codes.has(error.message)) return translate(`errors.${error.message}`);
  if (error.status === 400 && error.fieldErrors) {
    const all = Object.values(error.fieldErrors).flat();
    if (all.length) return all.join(' ');
  }
  if (error.status === 403) return translate('errors.forbidden');
  if (error.status === 404) return translate('common.states.notFound');
  if (error.status === 0) return translate('errors.network');
  return fallback;
}
