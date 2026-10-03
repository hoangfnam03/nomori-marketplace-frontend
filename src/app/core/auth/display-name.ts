import { AuthSession } from './auth.models';

/**
 * The name to greet a signed-in user with: their name when the profile has one, otherwise the email.
 * Vietnamese puts the family name first ("Nguyễn An"); English puts it last ("An Nguyen").
 */
export function displayName(session: Pick<AuthSession, 'firstName' | 'lastName' | 'email'> | null | undefined, lang: string): string {
  if (!session) return '';
  const first = session.firstName?.trim() ?? '';
  const last = session.lastName?.trim() ?? '';
  const parts = lang === 'vi' ? [last, first] : [first, last];
  return parts.filter(Boolean).join(' ') || session.email || '';
}
