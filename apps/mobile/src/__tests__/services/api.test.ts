// Mock the auth store before importing apiService
const mockGetToken = jest.fn();

jest.mock('../../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      token: mockGetToken(),
    }),
  },
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
}));

// Mock fetch
global.fetch = jest.fn();

import { apiService } from '../../services/api';

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Headers', () => {
    it('should include Content-Type header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: '1' } }),
      });

      await apiService.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include Authorization header when token exists', async () => {
      const token = 'test-jwt-token';
      mockGetToken.mockReturnValue(token);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: '1' } }),
      });

      await apiService.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      mockGetToken.mockReturnValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await apiService.getProfile();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('Login', () => {
    it('should call login endpoint with credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email },
            token: 'jwt-token',
          }),
      });

      const result = await apiService.login(email, password);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should return user and token on successful login', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com' },
        token: 'jwt-token-123',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should return error on failed login', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      const result = await apiService.login('test@example.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
  });

  describe('Register', () => {
    it('should call register endpoint with user data', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', ...userData },
            token: 'jwt-token',
          }),
      });

      const result = await apiService.register(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should return error on registration failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      const result = await apiService.register({
        email: 'existing@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already exists');
    });
  });

  describe('Profile', () => {
    it('should get user profile', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const result = await apiService.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/profile'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
    });

    it('should update user profile', async () => {
      const updates = { firstName: 'Jane' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'user-1',
            email: 'test@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
          }),
      });

      const result = await apiService.updateProfile(updates);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/profile'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Tickets', () => {
    it('should get all tickets', async () => {
      const mockTickets = [
        { id: 'ticket-1', eventName: 'Concert' },
        { id: 'ticket-2', eventName: 'Festival' },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTickets),
      });

      const result = await apiService.getTickets();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tickets'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTickets);
    });

    it('should get ticket by ID', async () => {
      const ticketId = 'ticket-123';
      const mockTicket = {
        id: ticketId,
        eventName: 'Summer Festival',
        status: 'valid',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTicket),
      });

      const result = await apiService.getTicketById(ticketId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/tickets/${ticketId}`),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTicket);
    });

    it('should validate ticket', async () => {
      const ticketId = 'ticket-123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      const result = await apiService.validateTicket(ticketId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/tickets/${ticketId}/validate`),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });
  });

  describe('Wallet', () => {
    it('should get wallet balance', async () => {
      const mockBalance = {
        available: 100.5,
        pending: 25.0,
        currency: 'EUR',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBalance),
      });

      const result = await apiService.getWalletBalance();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wallet/balance'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBalance);
    });

    it('should get transactions', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 50, type: 'topup' },
        { id: 'tx-2', amount: -10, type: 'purchase' },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTransactions),
      });

      const result = await apiService.getTransactions();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wallet/transactions'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransactions);
    });

    it('should topup wallet', async () => {
      const amount = 50.0;
      const paymentMethodId = 'pm_123';
      const mockTransaction = {
        id: 'tx-1',
        amount: 50,
        type: 'topup',
        status: 'completed',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTransaction),
      });

      const result = await apiService.topupWallet(amount, paymentMethodId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/wallet/topup'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount, paymentMethodId }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTransaction);
    });
  });

  describe('Program', () => {
    it('should get full program', async () => {
      const mockProgram = [
        { id: 'event-1', artist: { name: 'Artist 1' } },
        { id: 'event-2', artist: { name: 'Artist 2' } },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgram),
      });

      const result = await apiService.getProgram();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/program'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProgram);
    });

    it('should get program by day', async () => {
      const day = '2026-07-15';
      const mockProgram = [{ id: 'event-1', day, artist: { name: 'Artist 1' } }];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgram),
      });

      const result = await apiService.getProgramByDay(day);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/program?day=${day}`),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'New message', read: false },
        { id: 'notif-2', title: 'Reminder', read: true },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockNotifications),
      });

      const result = await apiService.getNotifications();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications'),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotifications);
    });

    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await apiService.markNotificationRead(notificationId);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/notifications/${notificationId}/read`),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
    });

    it('should register push token', async () => {
      const pushToken = 'expo-push-token-abc123';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await apiService.registerPushToken(pushToken);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/push-token'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: pushToken }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await apiService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' }),
      });

      const result = await apiService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await apiService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toContain('HTTP error');
    });

    it('should handle timeout errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Request timeout'));

      const result = await apiService.getTickets();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Request timeout');
    });

    it('should handle 401 unauthorized', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const result = await apiService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });

    it('should handle 404 not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Ticket not found' }),
      });

      const result = await apiService.getTicketById('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Ticket not found');
    });

    it('should handle unknown errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('Unknown error');

      const result = await apiService.getProfile();

      expect(result.success).toBe(false);
      expect(result.message).toBe('An error occurred');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await apiService.getTickets();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle null response data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await apiService.getProfile();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle special characters in request body', async () => {
      const userData = {
        email: 'test+special@example.com',
        password: 'p@ss&word=123',
        firstName: 'Jean-Pierre',
        lastName: "D'Alembert",
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: userData, token: 'token' }),
      });

      await apiService.register(userData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(userData),
        })
      );
    });
  });
});
