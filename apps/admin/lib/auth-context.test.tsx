/**
 * AuthContext Tests
 *
 * Tests for the auth context covering:
 * - AuthProvider rendering
 * - useAuth hook
 * - Login functionality
 * - Logout functionality
 * - withAuth HOC
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, withAuth } from './auth-context';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test component that uses useAuth
function TestConsumer() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

// Test component for HOC
function ProtectedComponent({ message }: { message: string }) {
  return <div data-testid="protected">{message}</div>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockPush.mockReset();
  });

  // ==========================================================================
  // AuthProvider Tests
  // ==========================================================================
  describe('AuthProvider', () => {
    it('should render children', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should check auth on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/me',
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        );
      });
    });

    it('should set user when auth check succeeds with admin role', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
    });

    it('should clear user when auth check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });
    });
  });

  // ==========================================================================
  // useAuth Hook Tests
  // ==========================================================================
  describe('useAuth', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = consoleError;
    });
  });

  // ==========================================================================
  // Login Tests
  // ==========================================================================
  describe('Login', () => {
    it('should call login API with credentials', async () => {
      const user = userEvent.setup();

      // Initial auth check
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      // Mock login API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/login',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
          })
        );
      });
    });

    it('should set user on successful login', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================
  describe('Logout', () => {
    it('should call logout API', async () => {
      const user = userEvent.setup();

      // Initial auth check - logged in
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      // Mock logout API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/logout',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });
    });

    it('should clear user on logout', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });
    });
  });

  // ==========================================================================
  // withAuth HOC Tests
  // ==========================================================================
  describe('withAuth HOC', () => {
    it('should show loading spinner while checking auth', () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      const ProtectedPage = withAuth(ProtectedComponent);

      render(
        <AuthProvider>
          <ProtectedPage message="Hello" />
        </AuthProvider>
      );

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render component when user is authenticated with correct role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
        }),
      });

      const ProtectedPage = withAuth(ProtectedComponent);

      render(
        <AuthProvider>
          <ProtectedPage message="Protected Content" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected')).toBeInTheDocument();
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should redirect to login when not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const ProtectedPage = withAuth(ProtectedComponent);

      render(
        <AuthProvider>
          <ProtectedPage message="Hello" />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });
});
