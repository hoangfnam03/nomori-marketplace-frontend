export interface AuthSession {
  isAuthenticated: boolean;
  customerId: number | null;
  email: string | null;
}

export interface CsrfResponse {
  token: string;
}
