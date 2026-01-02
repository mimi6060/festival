/**
 * API Client for FestivalHub Backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseUrl}/${API_VERSION}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Default headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge in any additional headers from options
    if (fetchOptions.headers) {
      const additionalHeaders = fetchOptions.headers as Record<string, string>;
      Object.assign(headers, additionalHeaders);
    }

    // Get auth token from cookie/localStorage if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: RequestOptions['params']): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export the API client instance
export const api = new ApiClient(API_URL);

// ===========================================
// API Endpoints
// ===========================================

// Festivals
export const festivalsApi = {
  getAll: (params?: { page?: number; limit?: number; genre?: string; country?: string }) =>
    api.get<Festival[]>('/festivals', params),

  getBySlug: (slug: string) =>
    api.get<Festival>(`/festivals/${slug}`),

  getFeatured: () =>
    api.get<Festival[]>('/festivals/featured'),

  search: (query: string) =>
    api.get<Festival[]>('/festivals/search', { q: query }),
};

// Tickets
export const ticketsApi = {
  getByFestival: (festivalId: string) =>
    api.get<TicketType[]>(`/festivals/${festivalId}/tickets`),

  purchase: (data: PurchaseTicketData) =>
    api.post<Order>('/orders', data),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get<User>('/auth/me'),

  refreshToken: () =>
    api.post<AuthResponse>('/auth/refresh'),
};

// User
export const userApi = {
  getProfile: () =>
    api.get<User>('/user/profile'),

  updateProfile: (data: Partial<User>) =>
    api.patch<User>('/user/profile', data),

  getTickets: () =>
    api.get<Ticket[]>('/user/tickets'),

  getOrders: () =>
    api.get<Order[]>('/user/orders'),

  getOrderById: (orderId: string) =>
    api.get<Order>(`/user/orders/${orderId}`),
};

// ===========================================
// Types
// ===========================================

export interface Festival {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  price: {
    from: number;
    currency: string;
  };
  genres: string[];
  isSoldOut?: boolean;
  isFeatured?: boolean;
}

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  available: number;
  maxPerOrder: number;
  features: string[];
  isPopular?: boolean;
  isSoldOut?: boolean;
}

export interface Ticket {
  id: string;
  orderId: string;
  festival: Festival;
  ticketType: TicketType;
  holderName: string;
  qrCode: string;
  status: 'valid' | 'used' | 'expired';
}

export interface Order {
  id: string;
  festivalId: string;
  items: {
    ticketTypeId: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface PurchaseTicketData {
  festivalId: string;
  tickets: {
    ticketTypeId: string;
    quantity: number;
  }[];
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  paymentMethod: {
    type: 'card';
    token: string;
  };
}
