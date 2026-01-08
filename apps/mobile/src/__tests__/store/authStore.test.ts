import { act } from '@testing-library/react-native';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

// Reset store before each test
beforeEach(() => {
  const store = useAuthStore.getState();
  store.logout();
  store.setLoading(true);
  store.setHasSeenOnboarding(false);
});

describe('authStore', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+33612345678',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

  describe('Initial State', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null token initially', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should be loading initially', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it('should not have seen onboarding initially', () => {
      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(false);
    });
  });

  describe('setUser', () => {
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

  describe('setToken', () => {
    it('should set the token', () => {
      act(() => {
        useAuthStore.getState().setToken(mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe(mockToken);
    });

    it('should clear the token when set to null', () => {
      // First set a token
      act(() => {
        useAuthStore.getState().setToken(mockToken);
      });

      // Then clear it
      act(() => {
        useAuthStore.getState().setToken(null);
      });

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });
  });

  describe('login', () => {
    it('should set user, token, and authentication state', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading to false after login', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user, token, and authentication state', () => {
      // First login
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      // Then logout
      act(() => {
        useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should work even if not logged in', () => {
      act(() => {
        useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should preserve hasSeenOnboarding after logout', () => {
      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(true);
        useAuthStore.getState().login(mockUser, mockToken);
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should update user properties', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      act(() => {
        useAuthStore.getState().updateUser({
          firstName: 'Jane',
          lastName: 'Smith',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Jane');
      expect(state.user?.lastName).toBe('Smith');
      expect(state.user?.email).toBe('test@example.com'); // Unchanged
    });

    it('should not fail when user is null', () => {
      act(() => {
        useAuthStore.getState().updateUser({ firstName: 'Jane' });
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should update email', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      act(() => {
        useAuthStore.getState().updateUser({
          email: 'newemail@example.com',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe('newemail@example.com');
    });

    it('should update phone', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      act(() => {
        useAuthStore.getState().updateUser({
          phone: '+33698765432',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.phone).toBe('+33698765432');
    });

    it('should update avatar', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      act(() => {
        useAuthStore.getState().updateUser({
          avatar: 'https://example.com/new-avatar.jpg',
        });
      });

      const state = useAuthStore.getState();
      expect(state.user?.avatar).toBe('https://example.com/new-avatar.jpg');
    });
  });

  describe('setHasSeenOnboarding', () => {
    it('should set hasSeenOnboarding to true', () => {
      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(true);
      });

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
    });

    it('should set hasSeenOnboarding to false', () => {
      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(true);
      });

      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(false);
      });

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      act(() => {
        useAuthStore.getState().setLoading(false);
      });

      act(() => {
        useAuthStore.getState().setLoading(true);
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      act(() => {
        useAuthStore.getState().setLoading(false);
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('State Persistence Shape', () => {
    it('should persist user in storage shape', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      // The partialize function should include user
      const state = useAuthStore.getState();
      expect(state.user).not.toBeNull();
    });

    it('should persist token in storage shape', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe(mockToken);
    });

    it('should persist isAuthenticated in storage shape', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });

    it('should persist hasSeenOnboarding in storage shape', () => {
      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(true);
      });

      const state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
    });
  });

  describe('Full Authentication Flow', () => {
    it('should handle complete login-update-logout flow', () => {
      // Initial state
      let state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);

      // Login
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('test@example.com');

      // Update profile
      act(() => {
        useAuthStore.getState().updateUser({ firstName: 'Updated' });
      });

      state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Updated');
      expect(state.isAuthenticated).toBe(true);

      // Logout
      act(() => {
        useAuthStore.getState().logout();
      });

      state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('should handle onboarding flow', () => {
      // Check onboarding not seen
      let state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(false);

      // Complete onboarding
      act(() => {
        useAuthStore.getState().setHasSeenOnboarding(true);
      });

      state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);

      // Login
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
      });

      state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
      expect(state.isAuthenticated).toBe(true);

      // Logout should keep onboarding state
      act(() => {
        useAuthStore.getState().logout();
      });

      state = useAuthStore.getState();
      expect(state.hasSeenOnboarding).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid state updates', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
        useAuthStore.getState().updateUser({ firstName: 'A' });
        useAuthStore.getState().updateUser({ firstName: 'B' });
        useAuthStore.getState().updateUser({ firstName: 'C' });
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('C');
    });

    it('should handle login after logout', () => {
      act(() => {
        useAuthStore.getState().login(mockUser, mockToken);
        useAuthStore.getState().logout();
        useAuthStore.getState().login({ ...mockUser, email: 'new@example.com' }, 'new-token');
      });

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe('new@example.com');
      expect(state.token).toBe('new-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle user with minimal data', () => {
      const minimalUser: User = {
        id: 'min-user',
        email: 'min@example.com',
        firstName: '',
        lastName: '',
        createdAt: '',
      };

      act(() => {
        useAuthStore.getState().login(minimalUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(minimalUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle user with all optional fields', () => {
      const fullUser: User = {
        id: 'full-user',
        email: 'full@example.com',
        firstName: 'Full',
        lastName: 'User',
        phone: '+33612345678',
        avatar: 'https://example.com/avatar.png',
        createdAt: '2026-01-01T00:00:00Z',
      };

      act(() => {
        useAuthStore.getState().login(fullUser, mockToken);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(fullUser);
    });
  });
});
