# Design Document: User Authentication System

## Overview

This document describes the technical design for a secure authentication system for the "laid" dating app. The system implements email/password registration, social authentication (Google, Apple, Facebook, and Instagram), email verification, JWT-based session management, bot prevention, and identity verification features.

The implementation uses:
- **Backend**: Node.js + Express + TypeScript with PostgreSQL database
- **Frontend**: React + TypeScript with Zustand for state management
- **Security**: bcrypt for password hashing, JWT for sessions, rate limiting, CAPTCHA for bot prevention
- **External Services**: Google OAuth, Apple Sign In, email service (nodemailer), CAPTCHA service

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[React Components]
        AuthContext[Auth Context]
        AuthService[Auth Service]
    end
    
    subgraph Backend
        API[Express API]
        AuthController[Auth Controller]
        Middleware[Auth Middleware]
        Services[Services Layer]
    end
    
    subgraph Services
        TokenService[Token Service]
        EmailService[Email Service]
        CaptchaService[CAPTCHA Service]
        SocialAuth[Social Auth Service]
    end
    
    subgraph Database
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis Cache)]
    end
    
    subgraph External
        Google[Google OAuth]
        Apple[Apple Sign In]
        EmailProvider[Email Provider]
        CaptchaProvider[CAPTCHA Provider]
    end
    
    UI --> AuthContext
    AuthContext --> AuthService
    AuthService --> API
    API --> AuthController
    AuthController --> Services
    AuthController --> Middleware
    Services --> PostgreSQL
    Services --> Redis
    TokenService --> Redis
    EmailService --> EmailProvider
    CaptchaService --> CaptchaProvider
    SocialAuth --> Google
    SocialAuth --> Apple
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DB
    participant Email
    
    User->>Frontend: Enter credentials
    Frontend->>API: POST /auth/register
    API->>API: Validate input
    API->>API: Hash password (bcrypt)
    API->>DB: Store user
    API->>Email: Send verification email
    API->>Frontend: Success response
    Frontend->>User: Show verification message
    
    User->>Email: Click verification link
    Email->>Frontend: Redirect with token
    Frontend->>API: POST /auth/verify-email
    API->>DB: Mark email verified
    API->>Frontend: Success
    
    User->>Frontend: Login
    Frontend->>API: POST /auth/login
    API->>DB: Verify credentials
    API->>API: Generate JWT tokens
    API->>DB: Store refresh token
    API->>Frontend: Return tokens + user data
    Frontend->>Frontend: Store tokens
```

## Components and Interfaces

### Backend Components

#### 1. Database Schema

**users table:**
```typescript
interface User {
  id: string;                    // UUID primary key
  email: string;                 // Unique, indexed
  password_hash: string | null;  // Null for social auth only
  email_verified: boolean;       // Default false
  verification_token: string | null;
  verification_token_expires: Date | null;
  google_id: string | null;      // Unique, indexed
  apple_id: string | null;       // Unique, indexed
  facebook_id: string | null;    // Unique, indexed
  instagram_id: string | null;   // Unique, indexed
  is_verified_identity: boolean; // Photo ID verification
  verification_photo_url: string | null;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  is_suspended: boolean;         // For fake account removal
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}
```

**refresh_tokens table:**
```typescript
interface RefreshToken {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to users
  token_hash: string;            // Hashed refresh token
  expires_at: Date;
  created_at: Date;
  revoked: boolean;              // For logout
}
```

**login_attempts table:**
```typescript
interface LoginAttempt {
  id: string;
  email: string;                 // Indexed
  ip_address: string;            // Indexed
  success: boolean;
  attempted_at: Date;
}
```

**account_flags table:**
```typescript
interface AccountFlag {
  id: string;
  user_id: string;               // Foreign key to users
  flag_type: 'suspicious_registration' | 'multiple_accounts' | 'bot_behavior';
  ip_address: string;
  device_fingerprint: string | null;
  flagged_at: Date;
  reviewed: boolean;
  reviewer_notes: string | null;
}
```

#### 2. API Endpoints

**Authentication Routes** (`/api/auth`):

```typescript
// Registration
POST /auth/register
Body: { email: string, password: string, captchaToken: string }
Response: { message: string, userId: string }

// Email verification
POST /auth/verify-email
Body: { token: string }
Response: { message: string }

// Resend verification email
POST /auth/resend-verification
Body: { email: string }
Response: { message: string }

// Login
POST /auth/login
Body: { email: string, password: string }
Response: { accessToken: string, refreshToken: string, user: UserProfile }

// Refresh token
POST /auth/refresh
Body: { refreshToken: string }
Response: { accessToken: string, refreshToken: string }

// Logout
POST /auth/logout
Headers: { Authorization: "Bearer <token>" }
Body: { refreshToken: string }
Response: { message: string }

// Google OAuth
GET /auth/google
Response: Redirect to Google OAuth

GET /auth/google/callback
Query: { code: string }
Response: { accessToken: string, refreshToken: string, user: UserProfile }

// Apple OAuth
GET /auth/apple
Response: Redirect to Apple Sign In

POST /auth/apple/callback
Body: { code: string, id_token: string }
Response: { accessToken: string, refreshToken: string, user: UserProfile }

// Facebook OAuth
GET /auth/facebook
Response: Redirect to Facebook OAuth

GET /auth/facebook/callback
Query: { code: string }
Response: { accessToken: string, refreshToken: string, user: UserProfile }

// Instagram OAuth
GET /auth/instagram
Response: Redirect to Instagram OAuth

GET /auth/instagram/callback
Query: { code: string }
Response: { accessToken: string, refreshToken: string, user: UserProfile }

// Identity verification
POST /auth/verify-identity
Headers: { Authorization: "Bearer <token>" }
Body: FormData with photo file
Response: { message: string, verificationId: string }

// Admin endpoints
GET /auth/admin/pending-verifications
Headers: { Authorization: "Bearer <admin-token>" }
Response: { verifications: VerificationRequest[] }

POST /auth/admin/verify-identity/:userId
Headers: { Authorization: "Bearer <admin-token>" }
Body: { approved: boolean, notes: string }
Response: { message: string }

GET /auth/admin/flagged-accounts
Headers: { Authorization: "Bearer <admin-token>" }
Response: { accounts: AccountFlag[] }

POST /auth/admin/suspend-account/:userId
Headers: { Authorization: "Bearer <admin-token>" }
Body: { reason: string }
Response: { message: string }
```

#### 3. Services Layer

**TokenService** (`src/services/tokenService.ts`):
```typescript
interface TokenService {
  generateAccessToken(userId: string, email: string): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): { userId: string, email: string } | null;
  storeRefreshToken(userId: string, token: string): Promise<void>;
  validateRefreshToken(token: string): Promise<{ userId: string } | null>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
```

**EmailService** (`src/services/emailService.ts`):
```typescript
interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}
```

**PasswordValidator** (`src/utils/passwordValidator.ts`):
```typescript
interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

interface PasswordValidator {
  validate(password: string): PasswordValidationResult;
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
```

**CaptchaService** (`src/services/captchaService.ts`):
```typescript
interface CaptchaService {
  verify(token: string, ip: string): Promise<{ success: boolean, score: number }>;
}
```

**SocialAuthService** (`src/services/socialAuthService.ts`):
```typescript
interface SocialAuthService {
  getGoogleAuthUrl(): string;
  verifyGoogleToken(code: string): Promise<GoogleUserInfo>;
  getAppleAuthUrl(): string;
  verifyAppleToken(code: string, idToken: string): Promise<AppleUserInfo>;
  getFacebookAuthUrl(): string;
  verifyFacebookToken(code: string): Promise<FacebookUserInfo>;
  getInstagramAuthUrl(): string;
  verifyInstagramToken(code: string): Promise<InstagramUserInfo>;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
}

interface AppleUserInfo {
  id: string;
  email: string;
}

interface FacebookUserInfo {
  id: string;
  email: string;
}

interface InstagramUserInfo {
  id: string;
  email: string;
}
```

**RateLimitService** (`src/services/rateLimitService.ts`):
```typescript
interface RateLimitService {
  checkLoginAttempts(email: string): Promise<{ allowed: boolean, remainingAttempts: number }>;
  recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void>;
  checkRegistrationRate(ip: string): Promise<boolean>;
}
```

**FraudDetectionService** (`src/services/fraudDetectionService.ts`):
```typescript
interface FraudDetectionService {
  checkSuspiciousRegistration(email: string, ip: string, deviceFingerprint: string): Promise<boolean>;
  flagAccount(userId: string, flagType: string, ip: string, deviceFingerprint: string): Promise<void>;
  getAccountFlags(userId: string): Promise<AccountFlag[]>;
}
```

#### 4. Middleware

**authMiddleware** (`src/middleware/auth.ts`):
```typescript
interface AuthMiddleware {
  requireAuth(req: Request, res: Response, next: NextFunction): void;
  requireAdmin(req: Request, res: Response, next: NextFunction): void;
  optionalAuth(req: Request, res: Response, next: NextFunction): void;
}
```

**rateLimitMiddleware** (`src/middleware/rateLimit.ts`):
```typescript
// Uses express-rate-limit
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per IP
  message: 'Too many registration attempts, please try again later'
});
```

### Frontend Components

#### 1. Authentication Context

**AuthContext** (`src/contexts/AuthContext.tsx`):
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, captchaToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithApple: () => void;
  refreshAccessToken: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}
```

#### 2. React Components

**LoginForm** (`src/components/auth/LoginForm.tsx`):
- Email and password inputs
- Form validation
- Error display
- Social login buttons (Google, Apple, Facebook, Instagram)
- Link to registration

**SignupForm** (`src/components/auth/SignupForm.tsx`):
- Email and password inputs
- Password strength indicator
- CAPTCHA widget
- Form validation
- Error display
- Social signup buttons (Google, Apple, Facebook, Instagram)
- Link to login

**EmailVerification** (`src/components/auth/EmailVerification.tsx`):
- Displays verification status
- Resend verification button
- Success/error messages

**IdentityVerification** (`src/components/auth/IdentityVerification.tsx`):
- Photo upload interface
- Preview uploaded photo
- Submission status
- Verification badge display

#### 3. Auth Service

**authService** (`src/services/authService.ts`):
```typescript
interface AuthService {
  register(email: string, password: string, captchaToken: string): Promise<void>;
  login(email: string, password: string): Promise<AuthResponse>;
  logout(refreshToken: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  verifyEmail(token: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  loginWithGoogle(): void;
  loginWithApple(): void;
  loginWithFacebook(): void;
  loginWithInstagram(): void;
  submitIdentityVerification(photo: File): Promise<void>;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
```

#### 4. HTTP Interceptor

**axiosInterceptor** (`src/utils/axiosInterceptor.ts`):
- Automatically adds Authorization header with access token
- Intercepts 401 responses
- Attempts token refresh
- Retries failed request with new token
- Redirects to login if refresh fails

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  googleId?: string;
  appleId?: string;
  isVerifiedIdentity: boolean;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  isSuspended: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}
```

### Token Payload

```typescript
interface AccessTokenPayload {
  userId: string;
  email: string;
  iat: number;  // Issued at
  exp: number;  // Expiration (15 minutes)
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string;  // Unique token ID for revocation
  iat: number;
  exp: number;  // Expiration (7 days)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Email and Password Validation

*For any* registration attempt with email and password inputs, the validation should correctly identify valid emails (proper format) and valid passwords (meeting all requirements), and reject invalid inputs with specific error messages.

**Validates: Requirements 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

### Property 2: Password Hashing Security

*For any* valid password, when stored in the database, the stored value should be a bcrypt hash that is different from the original password and cannot be reversed to obtain the original.

**Validates: Requirements 1.4, 3.1, 3.2, 3.4**

### Property 3: Password Comparison Security

*For any* user login attempt, password verification should use bcrypt's secure comparison function and correctly accept matching passwords while rejecting non-matching ones.

**Validates: Requirements 3.3**

### Property 4: Email Verification Required for Login

*For any* user account that has not completed email verification, login attempts should be rejected with an error indicating verification is required.

**Validates: Requirements 1.6, 5.4**

### Property 5: Verification Token Generation and Validation

*For any* newly registered user, a unique verification token should be generated, and when that token is submitted within 24 hours, it should successfully verify the email, but expired or invalid tokens should be rejected.

**Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**

### Property 6: Verification Email Delivery

*For any* successful registration or verification resend request, an email containing the verification link should be sent to the user's email address.

**Validates: Requirements 1.5, 4.2**

### Property 7: Login Input Validation

*For any* login attempt, the email format should be validated, and invalid email formats should be rejected before credential checking.

**Validates: Requirements 5.1**

### Property 8: JWT Token Generation on Successful Login

*For any* successful login with valid credentials and verified email, the system should generate both an access token (15-minute expiration) and a refresh token (7-day expiration) with proper signatures and payload data.

**Validates: Requirements 5.5, 5.6, 8.1, 8.2, 8.3, 8.4**

### Property 9: Social Authentication User Creation

*For any* first-time social authentication (Google, Apple, Facebook, or Instagram), a new user account should be created with email verified status and the social provider ID stored.

**Validates: Requirements 6.3, 6.6, 7.3, 7.6, 7A.3, 7A.6, 7B.3, 7B.6**

### Property 10: Social Authentication Returning User

*For any* social authentication attempt with a previously linked account, the existing user should be authenticated and JWT tokens generated.

**Validates: Requirements 6.4, 6.5, 7.4, 7.5, 7A.4, 7A.5, 7B.4, 7B.5**

### Property 11: Token Refresh Mechanism

*For any* expired access token paired with a valid refresh token, the system should issue a new access token with the same user session, generate a new refresh token, and invalidate the old refresh token.

**Validates: Requirements 8.5, 8.6, 9.1, 9.3**

### Property 12: JWT Signature Validation

*For any* request to a protected endpoint, tokens with invalid signatures should be rejected, and only properly signed tokens should be accepted.

**Validates: Requirements 8.7**

### Property 13: Refresh Token Storage and Validation

*For any* generated refresh token, it should be stored in the database, and subsequent refresh attempts should validate against stored tokens.

**Validates: Requirements 9.4**

### Property 14: Invalid Refresh Token Rejection

*For any* expired or invalid refresh token, the system should reject the refresh attempt and require re-authentication.

**Validates: Requirements 9.2**

### Property 15: Logout Token Revocation

*For any* logout request, all refresh tokens for that user should be invalidated, removed from the database, and subsequent attempts to use those tokens should be rejected.

**Validates: Requirements 9.5, 12.1, 12.3, 12.4**

### Property 16: Error Response HTTP Status Codes

*For any* authentication error, the system should return appropriate HTTP status codes (400 for validation, 401 for authentication, 429 for rate limiting, 500 for server errors).

**Validates: Requirements 10.1**

### Property 17: Validation Error Messages

*For any* validation failure, the system should return specific field-level error messages indicating which fields failed and why.

**Validates: Requirements 10.2**

### Property 18: Sensitive Information Protection in Errors

*For any* error response, the message should not contain sensitive information such as passwords, tokens, internal system details, or whether a user exists.

**Validates: Requirements 10.3, 10.6**

### Property 19: Failed Login Attempt Logging

*For any* failed authentication attempt, the system should log the email, IP address, timestamp, and failure reason.

**Validates: Requirements 11.3**

### Property 20: CAPTCHA Requirement for Registration

*For any* registration attempt without a valid CAPTCHA token, the system should reject the registration.

**Validates: Requirements 14.1, 14.2**

### Property 21: CAPTCHA Failure Logging

*For any* failed CAPTCHA verification, the system should log the failure with IP address and timestamp.

**Validates: Requirements 14.5**

### Property 22: Account Creation Pattern Tracking

*For any* registration, the system should record the IP address and device fingerprint for fraud detection analysis.

**Validates: Requirements 15.1**

### Property 23: Multiple Account Detection

*For any* IP address that creates multiple accounts within a short time period, the system should flag those accounts for review.

**Validates: Requirements 15.2**

### Property 24: Account Suspension Enforcement

*For any* suspended account, all tokens should be invalidated and login attempts should be rejected.

**Validates: Requirements 15.5**

### Property 25: Account Deletion Cleanup

*For any* deleted account, all associated authentication data (user record, tokens, login attempts, flags) should be removed from the database.

**Validates: Requirements 15.6**

### Property 26: Admin Action Audit Logging

*For any* administrative action (verification approval/rejection, account suspension, account deletion), the system should create an audit log entry with admin ID, action type, target user, and timestamp.

**Validates: Requirements 15.7**

### Property 27: Identity Verification Status Updates

*For any* identity verification photo submission, the status should change to pending, and upon admin approval, the verified badge should be added to the user profile.

**Validates: Requirements 13.2, 13.3, 13.5**

### Property 28: Identity Verification Resubmission

*For any* rejected identity verification, the user should be able to submit a new verification photo.

**Validates: Requirements 13.6**

## Error Handling

### Error Types and Responses

**Validation Errors (400 Bad Request):**
```typescript
{
  error: 'VALIDATION_ERROR',
  message: 'Validation failed',
  fields: {
    email: ['Invalid email format'],
    password: [
      'Password must be at least 8 characters',
      'Password must contain an uppercase letter',
      'Password must contain a number'
    ]
  }
}
```

**Authentication Errors (401 Unauthorized):**
```typescript
{
  error: 'AUTHENTICATION_FAILED',
  message: 'Invalid credentials'  // Generic to prevent user enumeration
}

{
  error: 'EMAIL_NOT_VERIFIED',
  message: 'Please verify your email before logging in'
}

{
  error: 'INVALID_TOKEN',
  message: 'Invalid or expired token'
}

{
  error: 'ACCOUNT_SUSPENDED',
  message: 'This account has been suspended'
}
```

**Rate Limiting Errors (429 Too Many Requests):**
```typescript
{
  error: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many attempts. Please try again later',
  retryAfter: 900  // seconds
}
```

**Server Errors (500 Internal Server Error):**
```typescript
{
  error: 'INTERNAL_ERROR',
  message: 'An error occurred. Please try again later'
}
// Detailed error logged server-side only
```

### Error Handling Strategy

1. **Input Validation**: Validate all inputs before processing
2. **Database Errors**: Catch and log database errors, return generic message to user
3. **External Service Failures**: Implement retry logic for email service, OAuth providers
4. **Token Errors**: Clear invalid tokens from client storage
5. **Network Errors**: Frontend should implement retry with exponential backoff
6. **Logging**: Log all errors with context (user ID, endpoint, timestamp) but never log passwords or tokens

### Security Considerations

1. **Generic Error Messages**: Login failures return same message whether email exists or password is wrong
2. **No Stack Traces**: Never expose stack traces or internal errors to clients
3. **Rate Limiting**: Prevent brute force attacks on login and registration
4. **Token Expiration**: Short-lived access tokens minimize exposure if compromised
5. **Refresh Token Rotation**: One-time use refresh tokens prevent replay attacks
6. **HTTPS Only**: All authentication endpoints require HTTPS in production
7. **CORS**: Restrict API access to authorized frontend domains
8. **SQL Injection Prevention**: Use parameterized queries for all database operations
9. **XSS Prevention**: Sanitize all user inputs, use httpOnly cookies
10. **CSRF Protection**: Implement CSRF tokens for state-changing operations

## Testing Strategy

### Dual Testing Approach

The authentication system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples and edge cases
- Integration between components
- Error conditions and boundary cases
- Mocking external services (email, OAuth, CAPTCHA)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Security properties (password hashing, token validation)
- Data integrity properties

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across many inputs.

### Property-Based Testing Configuration

**Library**: fast-check (already in dependencies)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: user-authentication, Property {N}: {property description}`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Feature: user-authentication, Property 1: Email and Password Validation', () => {
  it('should correctly validate emails and passwords across all inputs', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 100 }),
        (email, password) => {
          const result = validateRegistration(email, password);
          // Property assertions
          if (isValidEmail(email) && meetsPasswordRequirements(password)) {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Requirements

**Backend Tests**:
- Password validation: All rules tested with property tests
- Password hashing: Verify bcrypt usage and security
- Token generation: Verify JWT structure and expiration
- Token validation: Verify signature checking
- Email verification: Test token generation and validation
- Social auth: Mock OAuth providers and test user creation/login
- Rate limiting: Test attempt counting and blocking
- Fraud detection: Test pattern recognition and flagging
- Admin operations: Test verification approval and account suspension

**Frontend Tests**:
- Form validation: Test input validation and error display
- Auth context: Test state management and token storage
- API service: Test request/response handling
- Token refresh: Test automatic refresh on 401 responses
- Social auth: Test OAuth redirect flows
- Error handling: Test error message display

### Integration Testing

**End-to-End Flows**:
1. Complete registration flow (register → verify email → login)
2. Social authentication flow (Google/Apple → account creation → login)
3. Token refresh flow (login → access token expires → refresh → continue)
4. Logout flow (login → logout → verify tokens invalid)
5. Identity verification flow (upload photo → admin review → badge granted)
6. Rate limiting flow (multiple failed logins → blocked → wait → retry)

### Security Testing

**Penetration Testing Scenarios**:
1. SQL injection attempts on all inputs
2. XSS attempts in error messages
3. CSRF attacks on state-changing endpoints
4. Brute force login attempts
5. Token manipulation and replay attacks
6. User enumeration attempts
7. Password reset token guessing
8. Session fixation attacks

## Implementation Notes

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/laid
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<random-256-bit-secret>
JWT_REFRESH_SECRET=<random-256-bit-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@laid.app
EMAIL_PASSWORD=<email-password>
EMAIL_FROM=Laid <noreply@laid.app>

# OAuth
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

APPLE_CLIENT_ID=<apple-client-id>
APPLE_TEAM_ID=<apple-team-id>
APPLE_KEY_ID=<apple-key-id>
APPLE_PRIVATE_KEY=<apple-private-key>
APPLE_REDIRECT_URI=http://localhost:3000/auth/apple/callback

FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

INSTAGRAM_CLIENT_ID=<instagram-client-id>
INSTAGRAM_CLIENT_SECRET=<instagram-client-secret>
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# CAPTCHA (e.g., Google reCAPTCHA v3)
CAPTCHA_SECRET_KEY=<captcha-secret>
CAPTCHA_SITE_KEY=<captcha-site-key>
CAPTCHA_MIN_SCORE=0.5

# File Storage (for identity verification photos)
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_S3_BUCKET=laid-verification-photos
AWS_REGION=us-east-1

# Security
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_ATTEMPTS=5

# Frontend
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=<google-client-id>
VITE_APPLE_CLIENT_ID=<apple-client-id>
VITE_FACEBOOK_APP_ID=<facebook-app-id>
VITE_INSTAGRAM_CLIENT_ID=<instagram-client-id>
VITE_CAPTCHA_SITE_KEY=<captcha-site-key>
```

### Database Migrations

**Migration 001: Create users table**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,
  google_id VARCHAR(255) UNIQUE,
  apple_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  instagram_id VARCHAR(255) UNIQUE,
  is_verified_identity BOOLEAN DEFAULT FALSE,
  verification_photo_url VARCHAR(500),
  verification_status VARCHAR(20) DEFAULT 'none',
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_apple_id ON users(apple_id);
CREATE INDEX idx_users_facebook_id ON users(facebook_id);
CREATE INDEX idx_users_instagram_id ON users(instagram_id);
CREATE INDEX idx_users_verification_status ON users(verification_status);
```

**Migration 002: Create refresh_tokens table**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Migration 003: Create login_attempts table**
```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);
```

**Migration 004: Create account_flags table**
```sql
CREATE TABLE account_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  device_fingerprint VARCHAR(255),
  flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT
);

CREATE INDEX idx_account_flags_user_id ON account_flags(user_id);
CREATE INDEX idx_account_flags_reviewed ON account_flags(reviewed);
CREATE INDEX idx_account_flags_flagged_at ON account_flags(flagged_at);
```

**Migration 005: Create audit_logs table**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Third-Party Service Integration

**Google OAuth Setup**:
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

**Apple Sign In Setup**:
1. Register app in Apple Developer Portal
2. Enable Sign in with Apple capability
3. Create Service ID
4. Configure return URLs
5. Generate private key for JWT signing

**Facebook Login Setup**:
1. Create app in Facebook Developers Portal
2. Add Facebook Login product
3. Configure OAuth redirect URIs
4. Get App ID and App Secret
5. Set up app permissions (email, public_profile)

**Instagram Basic Display Setup**:
1. Create app in Facebook Developers Portal (Instagram is owned by Meta)
2. Add Instagram Basic Display product
3. Configure OAuth redirect URIs
4. Get Client ID and Client Secret
5. Set up required permissions

**CAPTCHA Setup** (Google reCAPTCHA v3):
1. Register site at google.com/recaptcha
2. Get site key and secret key
3. Add reCAPTCHA script to frontend
4. Implement server-side verification

**Email Service Setup**:
1. Choose email provider (SendGrid, AWS SES, Mailgun)
2. Configure SMTP credentials
3. Set up email templates
4. Configure SPF and DKIM records

### Performance Considerations

1. **Database Indexing**: Index frequently queried fields (email, social IDs, tokens)
2. **Token Caching**: Cache valid tokens in Redis to reduce database queries
3. **Rate Limit Storage**: Use Redis for rate limit counters (fast, automatic expiration)
4. **Connection Pooling**: Use pg connection pool for database connections
5. **Async Operations**: Send emails asynchronously (queue-based)
6. **Token Cleanup**: Scheduled job to delete expired tokens from database
7. **Login Attempt Cleanup**: Scheduled job to delete old login attempts (>30 days)

### Monitoring and Observability

**Metrics to Track**:
- Registration rate (per hour/day)
- Login success/failure rate
- Token refresh rate
- Email verification rate
- Social auth usage (Google vs Apple)
- Rate limit triggers
- CAPTCHA failure rate
- Account flags created
- Identity verification requests
- Average response times per endpoint

**Alerts to Configure**:
- High rate of failed logins (potential attack)
- High rate of CAPTCHA failures (bot activity)
- High rate of account flags (fraud wave)
- Email service failures
- Database connection issues
- High error rates on any endpoint
- Token generation failures

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis instance configured
- [ ] Email service configured and tested
- [ ] Google OAuth credentials configured
- [ ] Apple Sign In configured
- [ ] Facebook Login configured
- [ ] Instagram Basic Display configured
- [ ] CAPTCHA service configured
- [ ] S3 bucket created for verification photos
- [ ] HTTPS certificates installed
- [ ] CORS origins configured
- [ ] Rate limiting configured
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Security headers configured (Helmet.js)
- [ ] Log aggregation configured
- [ ] Error tracking configured (e.g., Sentry)
