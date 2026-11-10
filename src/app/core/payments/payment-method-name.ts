import { translate } from '@jsverse/transloco';

/** Methods with a name of their own in the app's languages; any other keeps the name the server gives. */
const NAMED = new Set(['cod', 'stripe', 'wallet']);

/** The name a customer sees for a payment method, in the current language. */
export function paymentMethodName(systemName: string | null | undefined, serverName?: string | null): string {
  if (systemName && NAMED.has(systemName)) return translate(`payments.methods.${systemName}`);
  return serverName ?? systemName ?? '';
}
