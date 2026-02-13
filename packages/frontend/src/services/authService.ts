const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    isVerifiedUser: boolean;
  };
}

export class AuthService {
  static async register(data: RegisterData): Promise<{ message: string; userId: string }> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.errors?.join(', ') || 'Registration failed');
    }

    return response.json();
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const result = await response.json();
    
    // Store tokens
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));

    return result;
  }

  static async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }

    return response.json();
  }

  static async resendVerification(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resend verification');
    }

    return response.json();
  }

  static async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, userId: user.id }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Session expired');
    }

    const result = await response.json();
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);

    return result;
  }

  static async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (refreshToken && user.id) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, userId: user.id }),
      });
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  static getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
