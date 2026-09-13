export interface AuthSession {
  isAuthenticated: boolean;
  customerId: number | null;
  email: string | null;
}

export interface CsrfResponse {
  token: string;
}

export interface RegistrationResponse {
  customerId: number;
  email: string;
}

export interface PermissionsResponse {
  permissions: string[];
}

export interface RecoveryResponse {
  message: string;
  token?: string;
}

export interface AuthFormError {
  status: number;
  message: string;
  code?: string | null;
}
