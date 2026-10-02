/** Business-rule codes returned by the API in ProblemDetails.detail (HTTP 409). */
const messages: Record<string, string> = {
  'vendor_application.email_not_verified': 'Please verify your email before applying to open a shop.',
  'vendor_application.already_vendor': 'Your account already belongs to a shop.',
  'vendor_application.already_pending': 'You already have an application waiting for review.',
  'vendor_application.not_pending': 'This application has already been processed.',
  'vendor_application.applicant_already_vendor': 'The applicant already belongs to another shop.',
  'vendor_member.email_already_exists': 'This email is already in use.',
  'vendor_member.limit_reached': 'The shop has reached its member limit.',
  'vendor_member.already_active': 'This member has already activated their account.',
  'product.hidden_by_admin': 'An administrator hid this product. You can edit it and ask for a review, but only an administrator can put it back on sale.',
  'product.not_hidden': 'This product is not hidden.',
  'product.already_hidden': 'This product is already hidden.',
  'product.invalid_transition': 'This change is not possible for the product in its current state.',
  'inventory.insufficient_stock': 'There is not enough stock for this change. Stock cannot go below zero or below the quantity customers are holding in their carts.',
  'inventory.reservation_expired': 'The stock hold has expired.',
  'inventory.active_reservations': 'Customers are holding stock of this product right now, so its variants cannot be replaced. Try again in a few minutes.',
  'currency.primary_locked': 'The primary currency cannot be switched or change its decimals once products exist, because their prices would change meaning.',
  'currency.primary_required': 'The primary currency must stay published and cannot be deleted. Make another currency primary first.',
  'currency.code_exists': 'A currency with this code already exists.',
  'vendor.platform_shop': 'The platform shop cannot be deleted or deactivated.',
  'vendor_member.last_member': 'A shop must keep at least one member.'
};

export interface ApiError {
  status?: number;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Turns an error normalised by the error interceptor into a message a person can read. */
export function vendorErrorMessage(error: ApiError, fallback: string): string {
  if (error.status === 409 && error.message && messages[error.message]) return messages[error.message];
  if (error.status === 400 && error.fieldErrors) {
    const all = Object.values(error.fieldErrors).flat();
    if (all.length) return all.join(' ');
  }
  if (error.status === 403) return 'You do not have permission to do this.';
  if (error.status === 404) return 'Not found.';
  if (error.status === 0) return 'Network error. Check your connection and try again.';
  return fallback;
}
