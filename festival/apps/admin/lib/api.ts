// API client for admin dashboard

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Dashboard
export const dashboardApi = {
  getStats: () => request<import('../types').DashboardStats>('/admin/dashboard/stats'),
  getRevenueChart: (period: 'week' | 'month' | 'year') =>
    request<import('../types').RevenueChartData>(`/admin/dashboard/revenue?period=${period}`),
  getTicketSalesChart: (period: 'week' | 'month' | 'year') =>
    request<import('../types').TicketSalesChartData>(`/admin/dashboard/ticket-sales?period=${period}`),
};

// Festivals
export const festivalsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    return request<import('../types').PaginatedResponse<import('../types').Festival>>(
      `/admin/festivals?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Festival>(`/admin/festivals/${id}`),
  create: (data: Partial<import('../types').Festival>) =>
    request<import('../types').Festival>('/admin/festivals', { method: 'POST', body: data }),
  update: (id: string, data: Partial<import('../types').Festival>) =>
    request<import('../types').Festival>(`/admin/festivals/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<void>(`/admin/festivals/${id}`, { method: 'DELETE' }),
  getStats: (id: string) =>
    request<{
      ticketsSold: number;
      revenue: number;
      capacity: number;
      checkIns: number;
    }>(`/admin/festivals/${id}/stats`),
};

// Ticket Categories
export const ticketCategoriesApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').TicketCategory[]>(`/admin/festivals/${festivalId}/ticket-categories`),
  create: (festivalId: string, data: Partial<import('../types').TicketCategory>) =>
    request<import('../types').TicketCategory>(`/admin/festivals/${festivalId}/ticket-categories`, {
      method: 'POST',
      body: data,
    }),
  update: (festivalId: string, categoryId: string, data: Partial<import('../types').TicketCategory>) =>
    request<import('../types').TicketCategory>(
      `/admin/festivals/${festivalId}/ticket-categories/${categoryId}`,
      { method: 'PUT', body: data }
    ),
  delete: (festivalId: string, categoryId: string) =>
    request<void>(`/admin/festivals/${festivalId}/ticket-categories/${categoryId}`, {
      method: 'DELETE',
    }),
};

// Tickets
export const ticketsApi = {
  getByFestival: (festivalId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    return request<import('../types').PaginatedResponse<import('../types').Ticket>>(
      `/admin/festivals/${festivalId}/tickets?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Ticket>(`/admin/tickets/${id}`),
  cancel: (id: string) =>
    request<import('../types').Ticket>(`/admin/tickets/${id}/cancel`, { method: 'POST' }),
  refund: (id: string) =>
    request<import('../types').Ticket>(`/admin/tickets/${id}/refund`, { method: 'POST' }),
};

// Users
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.role) searchParams.set('role', params.role);
    if (params?.search) searchParams.set('search', params.search);
    return request<import('../types').PaginatedResponse<import('../types').User>>(
      `/admin/users?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').User>(`/admin/users/${id}`),
  update: (id: string, data: Partial<import('../types').User>) =>
    request<import('../types').User>(`/admin/users/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  toggleActive: (id: string) =>
    request<import('../types').User>(`/admin/users/${id}/toggle-active`, { method: 'POST' }),
};

// Staff
export const staffApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').Staff[]>(`/admin/festivals/${festivalId}/staff`),
  getAll: (params?: { page?: number; limit?: number; role?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.role) searchParams.set('role', params.role);
    return request<import('../types').PaginatedResponse<import('../types').Staff>>(
      `/admin/staff?${searchParams.toString()}`
    );
  },
  assign: (festivalId: string, data: { userId: string; role: string; permissions: string[] }) =>
    request<import('../types').Staff>(`/admin/festivals/${festivalId}/staff`, {
      method: 'POST',
      body: data,
    }),
  update: (festivalId: string, staffId: string, data: Partial<import('../types').Staff>) =>
    request<import('../types').Staff>(`/admin/festivals/${festivalId}/staff/${staffId}`, {
      method: 'PUT',
      body: data,
    }),
  remove: (festivalId: string, staffId: string) =>
    request<void>(`/admin/festivals/${festivalId}/staff/${staffId}`, { method: 'DELETE' }),
};

// Payments
export const paymentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
    return request<import('../types').PaginatedResponse<import('../types').Payment>>(
      `/admin/payments?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Payment>(`/admin/payments/${id}`),
  refund: (id: string, amount?: number) =>
    request<import('../types').Payment>(`/admin/payments/${id}/refund`, {
      method: 'POST',
      body: amount ? { amount } : undefined,
    }),
};

// Orders
export const ordersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; festivalId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.festivalId) searchParams.set('festivalId', params.festivalId);
    return request<import('../types').PaginatedResponse<import('../types').Order>>(
      `/admin/orders?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Order>(`/admin/orders/${id}`),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: import('../types').User }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  logout: () => request<void>('/admin/auth/logout', { method: 'POST' }),
  me: () => request<import('../types').User>('/admin/auth/me'),
  refreshToken: () => request<{ token: string }>('/admin/auth/refresh', { method: 'POST' }),
};
