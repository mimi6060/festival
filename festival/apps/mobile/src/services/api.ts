import { useAuthStore } from '../store/authStore';
import type { ApiResponse, User, Ticket, WalletBalance, Transaction, ProgramEvent } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return { data: null as T, success: false, message };
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request('/api/auth/me');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Ticket endpoints
  async getTickets(): Promise<ApiResponse<Ticket[]>> {
    return this.request('/api/tickets/me');
  }

  async getTicketById(ticketId: string): Promise<ApiResponse<Ticket>> {
    return this.request(`/api/tickets/${ticketId}`);
  }

  async validateTicket(ticketId: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request(`/api/tickets/${ticketId}/validate`, {
      method: 'POST',
    });
  }

  // Wallet endpoints
  async getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
    return this.request('/api/cashless/balance');
  }

  async getTransactions(): Promise<ApiResponse<Transaction[]>> {
    return this.request('/api/cashless/transactions');
  }

  async topupWallet(amount: number, paymentMethodId: string): Promise<ApiResponse<Transaction>> {
    return this.request('/api/cashless/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethodId }),
    });
  }

  // Program endpoints
  async getProgram(): Promise<ApiResponse<ProgramEvent[]>> {
    return this.request('/api/program');
  }

  async getProgramByDay(day: string): Promise<ApiResponse<ProgramEvent[]>> {
    return this.request(`/api/program?day=${day}`);
  }

  // Notification endpoints
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.request('/api/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async registerPushToken(token: string): Promise<ApiResponse<void>> {
    return this.request('/api/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;
