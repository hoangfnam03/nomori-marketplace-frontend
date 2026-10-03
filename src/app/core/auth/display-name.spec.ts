import { displayName } from './display-name';

describe('displayName', () => {
  const session = { email: 'an@example.com', firstName: 'An', lastName: 'Nguyễn' };

  it('puts the family name first in Vietnamese and last in English', () => {
    expect(displayName(session, 'vi')).toBe('Nguyễn An');
    expect(displayName(session, 'en')).toBe('An Nguyễn');
  });

  it('uses whichever name part is filled in', () => {
    expect(displayName({ ...session, lastName: null }, 'vi')).toBe('An');
    expect(displayName({ ...session, firstName: '  ' }, 'en')).toBe('Nguyễn');
  });

  it('falls back to the email when the profile has no name', () => {
    expect(displayName({ ...session, firstName: null, lastName: null }, 'vi')).toBe('an@example.com');
    expect(displayName(null, 'vi')).toBe('');
  });
});
