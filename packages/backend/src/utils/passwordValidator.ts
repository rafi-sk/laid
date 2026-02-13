export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly UPPERCASE_REGEX = /[A-Z]/;
  private static readonly LOWERCASE_REGEX = /[a-z]/;
  private static readonly NUMBER_REGEX = /[0-9]/;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

  static validate(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    if (!this.UPPERCASE_REGEX.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!this.LOWERCASE_REGEX.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!this.NUMBER_REGEX.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!this.SPECIAL_CHAR_REGEX.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
