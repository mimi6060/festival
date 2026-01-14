/**
 * Auth Store Tests
 *
 * Tests for the Zustand auth store covering:
 * - State initialization
 * - Login functionality
 * - Registration functionality
 * - Logout functionality
 * - Profile updates
 * - Error handling
 * - Selectors
 */

import { act } from '@testing-library/react';
import {
  useAuthStore,
  User,
  LoginCredentials,
  RegisterData,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectUserRole,
} from './auth.store';

// Mock user data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+33612345678',
  role: 'attendee',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockLoginCredentials: LoginCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

const mockRegisterData: RegisterData = {
  email: 'new@example.com',
  password: 'password123',
  firstName: 'Jane',
  lastName: 'Smith',
  phone: '+33698765432',
};

describe('Auth Store', () => {
  // Reset store before each test
  beforeEach(() => {
    // Clear the store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    });

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================
  describe('Initial State', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should not be loading initially', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('should not be initialized initially', () => {
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('should have no error initially', () => {
      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  // ==========================================================================
  // setUser Action Tests
  // ==========================================================================
  describe('setUser Action', () => {
    it('should set user and mark as authenticated', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user and mark as not authenticated when null', () => {
      // First set a user
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      // Then clear it
      act(() => {
        useAuthStore.getState().setUser(null);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ==========================================================================
  // Login Action Tests
  // ==========================================================================
  describe('Login Action', () => {
    it('should login successfully with valid credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      let resolvePromise: ((value: unknown) => void) | undefined;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(pendingPromise);

      // Start login
      const loginPromise = act(async () => {
        return useAuthStore
          .getState()
          .login(mockLoginCredentials)
          .catch(() => {
            // Ignore error
          });
      });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve the promise
      if (resolvePromise) {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });
      }

      await loginPromise;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await act(async () => {
        try {
          await useAuthStore.getState().login(mockLoginCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });

    it('should handle network error during login', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        try {
          await useAuthStore.getState().login(mockLoginCredentials);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('should call fetch with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockLoginCredentials),
          credentials: 'include',
        })
      );
    });

    it('should clear previous error before login', async () => {
      // Set an error first
      useAuthStore.setState({ error: 'Previous error' });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials);
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ==========================================================================
  // Register Action Tests
  // ==========================================================================
  describe('Register Action', () => {
    it('should register successfully', async () => {
      const newUser = { ...mockUser, ...mockRegisterData };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: newUser }),
      });

      await act(async () => {
        await useAuthStore.getState().register(mockRegisterData);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(newUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle registration failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      await act(async () => {
        try {
          await useAuthStore.getState().register(mockRegisterData);
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe('Email already exists');
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call fetch with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      await act(async () => {
        await useAuthStore.getState().register(mockRegisterData);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockRegisterData),
          credentials: 'include',
        })
      );
    });
  });

  // ==========================================================================
  // Logout Action Tests
  // ==========================================================================
  describe('Logout Action', () => {
    it('should logout and clear user state', async () => {
      // First login
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear state even if logout API fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call logout API endpoint', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });

  // ==========================================================================
  // UpdateProfile Action Tests
  // ==========================================================================
  describe('UpdateProfile Action', () => {
    it('should update user profile', () => {
      useAuthStore.setState({ user: mockUser });

      act(() => {
        useAuthStore.getState().updateProfile({ firstName: 'Updated' });
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Updated');
      expect(state.user?.lastName).toBe('Doe'); // Unchanged
    });

    it('should handle multiple profile updates', () => {
      useAuthStore.setState({ user: mockUser });

      act(() => {
        useAuthStore.getState().updateProfile({
          firstName: 'New',
          lastName: 'Name',
          phone: '+33600000000',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('New');
      expect(state.user?.lastName).toBe('Name');
      expect(state.user?.phone).toBe('+33600000000');
    });

    it('should not crash when updating with no user', () => {
      useAuthStore.setState({ user: null });

      act(() => {
        useAuthStore.getState().updateProfile({ firstName: 'Test' });
      });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // ==========================================================================
  // ClearError Action Tests
  // ==========================================================================
  describe('ClearError Action', () => {
    it('should clear error', () => {
      useAuthStore.setState({ error: 'Some error' });

      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not affect other state when clearing error', () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        error: 'Error',
      });

      act(() => {
        useAuthStore.getState().clearError();
      });

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  // ==========================================================================
  // Initialize Action Tests
  // ==========================================================================
  describe('Initialize Action', () => {
    it('should set isInitialized to true after initialize', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it('should authenticate user if session is valid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not authenticate if session is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });

  // ==========================================================================
  // CheckAuth Action Tests
  // ==========================================================================
  describe('CheckAuth Action', () => {
    it('should set user when auth check succeeds', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user when auth check fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle network error during auth check', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call /auth/me with credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      await act(async () => {
        await useAuthStore.getState().checkAuth();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });
  });

  // ==========================================================================
  // Selectors Tests
  // ==========================================================================
  describe('Selectors', () => {
    it('selectUser should return user', () => {
      useAuthStore.setState({ user: mockUser });
      const state = useAuthStore.getState();

      expect(selectUser(state)).toEqual(mockUser);
    });

    it('selectUser should return null when no user', () => {
      useAuthStore.setState({ user: null });
      const state = useAuthStore.getState();

      expect(selectUser(state)).toBeNull();
    });

    it('selectIsAuthenticated should return authentication status', () => {
      useAuthStore.setState({ isAuthenticated: true });
      const state = useAuthStore.getState();

      expect(selectIsAuthenticated(state)).toBe(true);
    });

    it('selectIsLoading should return loading status', () => {
      useAuthStore.setState({ isLoading: true });
      const state = useAuthStore.getState();

      expect(selectIsLoading(state)).toBe(true);
    });

    it('selectAuthError should return error', () => {
      useAuthStore.setState({ error: 'Test error' });
      const state = useAuthStore.getState();

      expect(selectAuthError(state)).toBe('Test error');
    });

    it('selectUserRole should return user role', () => {
      useAuthStore.setState({ user: mockUser });
      const state = useAuthStore.getState();

      expect(selectUserRole(state)).toBe('attendee');
    });

    it('selectUserRole should return undefined when no user', () => {
      useAuthStore.setState({ user: null });
      const state = useAuthStore.getState();

      expect(selectUserRole(state)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle concurrent login calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      // Start two logins concurrently
      await act(async () => {
        await Promise.all([
          useAuthStore.getState().login(mockLoginCredentials),
          useAuthStore.getState().login(mockLoginCredentials),
        ]);
      });

      // Should still be in valid state
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle login after logout', async () => {
      // First login
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials);
      });

      // Logout
      await act(async () => {
        await useAuthStore.getState().logout();
      });

      // Login again
      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle empty error message from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        try {
          await useAuthStore.getState().login(mockLoginCredentials);
        } catch {
          // Expected
        }
      });

      // Should use default error message
      expect(useAuthStore.getState().error).toBe('Login failed');
    });
  });
});
