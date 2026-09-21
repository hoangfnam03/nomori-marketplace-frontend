import { Validators } from '@angular/forms';

export const clientPasswordPolicy = {
  minimumLength: 12,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/
} as const;

export const passwordValidators = [
  Validators.required,
  Validators.minLength(clientPasswordPolicy.minimumLength),
  Validators.pattern(clientPasswordPolicy.pattern)
];
