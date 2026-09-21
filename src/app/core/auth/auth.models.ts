export interface AuthSession {
  isAuthenticated: boolean;
  customerId: number | null;
  email: string | null;
  emailVerified: boolean | null;
  emailOtpEnabled: boolean | null;
}

export interface CsrfResponse {
  token: string;
}

export interface RegistrationResponse {
  customerId: number;
  email: string;
  emailVerified: boolean;
  verificationToken?: string | null;
}

export interface LoginResponse {
  otpRequired?: boolean;
  challengeId?: string;
  expiresOnUtc?: string;
  developmentCode?: string | null;
}

export interface OtpChallengeResponse {
  challengeId: string;
  expiresOnUtc: string;
  developmentCode?: string | null;
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
  fieldErrors?: Record<string, string[]>;
}

export interface PasswordPolicy {
  minimumLength: number;
  requiresUppercase: boolean;
  requiresLowercase: boolean;
  requiresDigit: boolean;
  requiresNonAlphanumeric: boolean;
}
