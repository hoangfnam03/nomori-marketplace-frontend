export interface CustomerProfile {
  customerId: number;
  email: string;
  emailVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
}
