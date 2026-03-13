import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factories run (hoisted to top)
const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('../api.service', () => ({
  apiService: {
    post: mockPost,
    get: mockGet,
  },
  default: {
    post: mockPost,
    get: mockGet,
  },
}));

vi.mock('../../config/api', () => ({
  API_ENDPOINTS: {
    AUTH_LOGIN: '/api/tickets/auth/login/',
    AUTH_REGISTER: '/api/tickets/auth/register/',
    AUTH_ME: '/api/tickets/auth/me/',
    AUTH_TOKEN_REFRESH: '/api/tickets/auth/token/refresh/',
    AUTH_LOGOUT: '/api/tickets/auth/logout/',
    AUTH_PASSWORD_RESET: '/api/tickets/auth/password-reset/',
    AUTH_PASSWORD_RESET_VALIDATE: '/api/tickets/auth/password-reset/validate/',
    AUTH_PASSWORD_RESET_CONFIRM: '/api/tickets/auth/password-reset/confirm/',
  },
  API_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  API_BASE_URL: '',
  API_CONFIG: {
    timeout: 30000,
    withCredentials: true,
  },
}));

// Import after mocking
import { authService } from '../auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should call apiService.post with login endpoint and credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      mockPost.mockResolvedValueOnce({ user: mockUser });

      const result = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(mockPost).toHaveBeenCalledWith('/api/tickets/auth/login/', {
        username: 'testuser',
        password: 'password123',
      });
      expect(result.user).toEqual(mockUser);
    });

    it('should store user in localStorage after login', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      mockPost.mockResolvedValueOnce({ user: mockUser });

      await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      const storedUser = JSON.parse(localStorage.getItem('user')!);
      expect(storedUser).toEqual(mockUser);
    });

    it('should throw when login fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        authService.login({ username: 'bad', password: 'bad' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call apiService.post with register endpoint and data', async () => {
      const mockUser = {
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
      };
      mockPost.mockResolvedValueOnce({ user: mockUser });

      const registerData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass123',
        password_confirm: 'securepass123',
        first_name: 'New',
        last_name: 'User',
      };

      const result = await authService.register(registerData);

      expect(mockPost).toHaveBeenCalledWith(
        '/api/tickets/auth/register/',
        registerData
      );
      expect(result.user).toEqual(mockUser);
    });

    it('should store user in localStorage after registration', async () => {
      const mockUser = {
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
      };
      mockPost.mockResolvedValueOnce({ user: mockUser });

      await authService.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass123',
        password_confirm: 'securepass123',
      });

      const storedUser = JSON.parse(localStorage.getItem('user')!);
      expect(storedUser).toEqual(mockUser);
    });
  });

  describe('getCurrentUser', () => {
    it('should call apiService.get with auth me endpoint', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };
      mockGet.mockResolvedValueOnce(mockUser);

      const result = await authService.getCurrentUser();

      expect(mockGet).toHaveBeenCalledWith('/api/tickets/auth/me/');
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should call apiService.post with logout endpoint', async () => {
      mockPost.mockResolvedValueOnce({});
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      await authService.logout();

      expect(mockPost).toHaveBeenCalledWith('/api/tickets/auth/logout/');
    });

    it('should clear user from localStorage', async () => {
      mockPost.mockResolvedValueOnce({});
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      await authService.logout();

      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear localStorage even if API call fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      await authService.logout();

      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getUser', () => {
    it('should return user from localStorage', () => {
      const mockUser = { id: 1, username: 'testuser' };
      localStorage.setItem('user', JSON.stringify(mockUser));

      const result = authService.getUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user in localStorage', () => {
      const result = authService.getUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is stored in localStorage', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'testuser' }));

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no user in localStorage', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false after user is removed from localStorage', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'testuser' }));
      localStorage.removeItem('user');

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should call apiService.post with token refresh endpoint', async () => {
      mockPost.mockResolvedValueOnce({});

      await authService.refreshToken();

      expect(mockPost).toHaveBeenCalledWith('/api/tickets/auth/token/refresh/');
    });
  });

  describe('requestPasswordReset', () => {
    it('should call apiService.post with email and admin source', async () => {
      mockPost.mockResolvedValueOnce({});

      await authService.requestPasswordReset('user@example.com');

      expect(mockPost).toHaveBeenCalledWith('/api/tickets/auth/password-reset/', {
        email: 'user@example.com',
        source: 'admin',
      });
    });
  });

  describe('validateResetToken', () => {
    it('should call apiService.post with uid and token', async () => {
      mockPost.mockResolvedValueOnce({ valid: true });

      const result = await authService.validateResetToken('abc123', 'token456');

      expect(mockPost).toHaveBeenCalledWith(
        '/api/tickets/auth/password-reset/validate/',
        { uid: 'abc123', token: 'token456' }
      );
      expect(result).toEqual({ valid: true });
    });
  });

  describe('confirmPasswordReset', () => {
    it('should call apiService.post with uid, token, and new password', async () => {
      mockPost.mockResolvedValueOnce({});

      await authService.confirmPasswordReset('abc123', 'token456', 'newpass789');

      expect(mockPost).toHaveBeenCalledWith(
        '/api/tickets/auth/password-reset/confirm/',
        {
          uid: 'abc123',
          token: 'token456',
          new_password: 'newpass789',
        }
      );
    });
  });
});
