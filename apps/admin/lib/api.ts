// API client for admin dashboard

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // Use httpOnly cookies for authentication - no localStorage tokens needed
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Send cookies with request
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
    request<import('../types').TicketSalesChartData>(
      `/admin/dashboard/ticket-sales?period=${period}`
    ),
};

// Festivals
export const festivalsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
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
    request<import('../types').TicketCategory[]>(
      `/admin/festivals/${festivalId}/ticket-categories`
    ),
  create: (festivalId: string, data: Partial<import('../types').TicketCategory>) =>
    request<import('../types').TicketCategory>(`/admin/festivals/${festivalId}/ticket-categories`, {
      method: 'POST',
      body: data,
    }),
  update: (
    festivalId: string,
    categoryId: string,
    data: Partial<import('../types').TicketCategory>
  ) =>
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
  getByFestival: (
    festivalId: string,
    params?: { page?: number; limit?: number; status?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
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
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.role) {
      searchParams.set('role', params.role);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    return request<import('../types').PaginatedResponse<import('../types').User>>(
      `/admin/users?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').User>(`/admin/users/${id}`),
  update: (id: string, data: Partial<import('../types').User>) =>
    request<import('../types').User>(`/admin/users/${id}`, { method: 'PUT', body: data }),
  updateProfile: (id: string, data: { firstName?: string; lastName?: string; email?: string }) =>
    request<import('../types').User>(`/users/${id}`, { method: 'PATCH', body: data }),
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
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.role) {
      searchParams.set('role', params.role);
    }
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
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.dateFrom) {
      searchParams.set('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      searchParams.set('dateTo', params.dateTo);
    }
    return request<import('../types').PaginatedResponse<import('../types').Payment>>(
      `/admin/payments?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Payment>(`/admin/payments/${id}`),
  // Refund endpoints
  createRefund: (data: import('../types').CreateRefundRequest) =>
    request<import('../types').RefundResponse>('/payments/refunds', {
      method: 'POST',
      body: data,
    }),
  createPartialRefund: (data: import('../types').PartialRefundRequest) =>
    request<import('../types').RefundResponse>('/payments/refunds/partial', {
      method: 'POST',
      body: data,
    }),
  createBulkRefund: (data: import('../types').BulkRefundRequest) =>
    request<import('../types').BulkRefundResponse>('/payments/refunds/bulk', {
      method: 'POST',
      body: data,
    }),
  checkRefundEligibility: (paymentId: string) =>
    request<import('../types').RefundEligibility>(`/payments/refunds/eligibility/${paymentId}`),
  getRefundHistory: (paymentId: string) =>
    request<import('../types').RefundResponse[]>(`/payments/refunds/history/${paymentId}`),
  getRefund: (refundId: string) =>
    request<import('../types').RefundResponse>(`/payments/refunds/${refundId}`),
  cancelRefund: (refundId: string) =>
    request<import('../types').RefundResponse>(`/payments/refunds/${refundId}/cancel`, {
      method: 'POST',
    }),
};

// Orders
export const ordersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; festivalId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.festivalId) {
      searchParams.set('festivalId', params.festivalId);
    }
    return request<import('../types').PaginatedResponse<import('../types').Order>>(
      `/admin/orders?${searchParams.toString()}`
    );
  },
  getById: (id: string) => request<import('../types').Order>(`/admin/orders/${id}`),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<import('../types').User>('/auth/me'),
  refreshToken: () => request<{ token: string }>('/auth/refresh', { method: 'POST' }),
};

// Cashless Admin API
export const cashlessAdminApi = {
  getAccounts: (festivalId: string) =>
    request<import('../types').CashlessAccount[]>(
      `/admin/festivals/${festivalId}/cashless/accounts`
    ),
  getAccountsWithBalance: (festivalId: string) =>
    request<import('../types').CashlessAccount[]>(
      `/admin/festivals/${festivalId}/cashless/accounts?hasBalance=true`
    ),
  massRefund: (data: import('../types').CashlessMassRefundRequest) =>
    request<import('../types').CashlessMassRefundResponse>('/admin/cashless/mass-refund', {
      method: 'POST',
      body: data,
    }),
};

// Vendors
export const vendorsApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').Vendor[]>(`/admin/festivals/${festivalId}/vendors`),
  getById: (id: string) => request<import('../types').Vendor>(`/admin/vendors/${id}`),
  create: (festivalId: string, data: import('../types').CreateVendorDto) =>
    request<import('../types').Vendor>(`/admin/festivals/${festivalId}/vendors`, {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: import('../types').UpdateVendorDto) =>
    request<import('../types').Vendor>(`/admin/vendors/${id}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (id: string) => request<void>(`/admin/vendors/${id}`, { method: 'DELETE' }),
  toggleOpen: (id: string, isOpen: boolean) =>
    request<import('../types').Vendor>(`/admin/vendors/${id}/toggle-open`, {
      method: 'POST',
      body: { isOpen },
    }),
};

// Camping
export const campingApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').CampingZone[]>(`/admin/festivals/${festivalId}/camping`),
  getById: (id: string) => request<import('../types').CampingZone>(`/admin/camping/${id}`),
  create: (festivalId: string, data: import('../types').CreateCampingZoneDto) =>
    request<import('../types').CampingZone>(`/admin/festivals/${festivalId}/camping`, {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: import('../types').UpdateCampingZoneDto) =>
    request<import('../types').CampingZone>(`/admin/camping/${id}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (id: string) => request<void>(`/admin/camping/${id}`, { method: 'DELETE' }),
};

// POIs (Points of Interest)
export const poisApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').Poi[]>(`/admin/festivals/${festivalId}/pois`),
  getById: (id: string) => request<import('../types').Poi>(`/admin/pois/${id}`),
  create: (festivalId: string, data: import('../types').CreatePoiDto) =>
    request<import('../types').Poi>(`/admin/festivals/${festivalId}/pois`, {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: import('../types').UpdatePoiDto) =>
    request<import('../types').Poi>(`/admin/pois/${id}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (id: string) => request<void>(`/admin/pois/${id}`, { method: 'DELETE' }),
};

// Artists
export const artistsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; genre?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.genre) {
      searchParams.set('genre', params.genre);
    }
    return request<import('../types').PaginatedResponse<import('../types').Artist>>(
      `/admin/artists?${searchParams.toString()}`
    );
  },
  getByFestival: (festivalId: string) =>
    request<import('../types').Artist[]>(`/admin/festivals/${festivalId}/artists`),
  getById: (id: string) => request<import('../types').Artist>(`/admin/artists/${id}`),
  getGenres: () => request<string[]>('/admin/artists/genres'),
  create: (data: Partial<import('../types').Artist>) =>
    request<import('../types').Artist>('/admin/artists', {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: Partial<import('../types').Artist>) =>
    request<import('../types').Artist>(`/admin/artists/${id}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (id: string) => request<void>(`/admin/artists/${id}`, { method: 'DELETE' }),
};

// Stages
export const stagesApi = {
  getByFestival: (festivalId: string) =>
    request<import('../types').Stage[]>(`/admin/festivals/${festivalId}/stages`),
  getById: (id: string) => request<import('../types').Stage>(`/admin/stages/${id}`),
  create: (festivalId: string, data: import('../types').CreateStageDto) =>
    request<import('../types').Stage>(`/admin/festivals/${festivalId}/stages`, {
      method: 'POST',
      body: data,
    }),
  update: (id: string, data: import('../types').UpdateStageDto) =>
    request<import('../types').Stage>(`/admin/stages/${id}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (id: string) => request<void>(`/admin/stages/${id}`, { method: 'DELETE' }),
};

// Lineup (Performance slots)
export const lineupApi = {
  getByFestival: (
    festivalId: string,
    params?: { stageId?: string; date?: string; includeCancelled?: boolean }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.stageId) {
      searchParams.set('stageId', params.stageId);
    }
    if (params?.date) {
      searchParams.set('date', params.date);
    }
    if (params?.includeCancelled) {
      searchParams.set('includeCancelled', 'true');
    }
    return request<import('../types').Performance[]>(
      `/admin/festivals/${festivalId}/lineup?${searchParams.toString()}`
    );
  },
  getByStage: (stageId: string) =>
    request<import('../types').Performance[]>(`/admin/stages/${stageId}/lineup`),
  getPerformanceById: (id: string) =>
    request<import('../types').Performance>(`/admin/lineup/${id}`),
  createPerformance: (festivalId: string, data: import('../types').CreatePerformanceDto) =>
    request<import('../types').Performance>(`/admin/festivals/${festivalId}/lineup`, {
      method: 'POST',
      body: data,
    }),
  updatePerformance: (id: string, data: Partial<import('../types').UpdatePerformanceDto>) =>
    request<import('../types').Performance>(`/admin/lineup/${id}`, {
      method: 'PUT',
      body: data,
    }),
  deletePerformance: (id: string) => request<void>(`/admin/lineup/${id}`, { method: 'DELETE' }),
  cancelPerformance: (id: string) =>
    request<import('../types').Performance>(`/admin/lineup/${id}/cancel`, { method: 'POST' }),
};

// Sessions
export const sessionsApi = {
  getAll: () => request<import('../types').Session[]>('/auth/sessions'),
  revoke: (sessionId: string) => request<void>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeAll: () => request<void>('/auth/sessions', { method: 'DELETE' }),
};

// API Keys
export const apiKeysApi = {
  getAll: () => request<import('../types').ApiKey[]>('/api-keys'),
  getById: (id: string) => request<import('../types').ApiKey>(`/api-keys/${id}`),
  create: (data: { name: string; description?: string; tier?: string; scopes?: string[] }) =>
    request<import('../types').CreateApiKeyResponse>('/api-keys', { method: 'POST', body: data }),
  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    request<import('../types').ApiKey>(`/api-keys/${id}`, { method: 'PATCH', body: data }),
  revoke: (id: string) => request<void>(`/api-keys/${id}/revoke`, { method: 'POST' }),
  delete: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  getStats: () =>
    request<{
      total: number;
      active: number;
      expired: number;
      revoked: number;
    }>('/api-keys/stats'),
};

// Webhooks
export const webhooksApi = {
  getAll: (festivalId: string) =>
    request<{
      items: import('../types').Webhook[];
      total: number;
      page: number;
      limit: number;
    }>(`/festivals/${festivalId}/webhooks`),
  getById: (festivalId: string, webhookId: string) =>
    request<import('../types').Webhook>(`/festivals/${festivalId}/webhooks/${webhookId}`),
  create: (festivalId: string, data: import('../types').CreateWebhookDto) =>
    request<import('../types').Webhook & { secret: string }>(`/festivals/${festivalId}/webhooks`, {
      method: 'POST',
      body: data,
    }),
  update: (festivalId: string, webhookId: string, data: import('../types').UpdateWebhookDto) =>
    request<import('../types').Webhook>(`/festivals/${festivalId}/webhooks/${webhookId}`, {
      method: 'PUT',
      body: data,
    }),
  delete: (festivalId: string, webhookId: string) =>
    request<void>(`/festivals/${festivalId}/webhooks/${webhookId}`, { method: 'DELETE' }),
  test: (festivalId: string, webhookId: string, event?: string) =>
    request<{ success: boolean; message: string }>(
      `/festivals/${festivalId}/webhooks/${webhookId}/test`,
      { method: 'POST', body: event ? { event } : undefined }
    ),
  regenerateSecret: (festivalId: string, webhookId: string) =>
    request<{ secret: string; message: string }>(
      `/festivals/${festivalId}/webhooks/${webhookId}/regenerate-secret`,
      { method: 'POST' }
    ),
  getDeliveries: (festivalId: string, webhookId: string) =>
    request<{
      items: import('../types').WebhookDelivery[];
      total: number;
      page: number;
      limit: number;
    }>(`/festivals/${festivalId}/webhooks/${webhookId}/deliveries`),
  getEvents: (festivalId: string) =>
    request<{
      events: { event: string; category: string; description: string }[];
      byCategory: Record<string, string[]>;
    }>(`/festivals/${festivalId}/webhooks/events`),
};

// Two-Factor Authentication
export const twoFactorApi = {
  getStatus: () => request<import('../types').TwoFactorStatus>('/auth/2fa/status'),
  setup: () =>
    request<import('../types').TwoFactorSetupResponse>('/auth/2fa/setup', { method: 'POST' }),
  enable: (code: string) =>
    request<{ success: boolean; backupCodes?: string[] }>('/auth/2fa/enable', {
      method: 'POST',
      body: { code },
    }),
  disable: (code: string) =>
    request<{ success: boolean }>('/auth/2fa/disable', {
      method: 'POST',
      body: { code },
    }),
  verify: (code: string) =>
    request<{ success: boolean }>('/auth/2fa/verify', {
      method: 'POST',
      body: { code },
    }),
};

// Password Change
export const passwordApi = {
  change: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, confirmPassword },
    }),
};

// File Upload
export const uploadApi = {
  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    const response = await fetch(`${API_BASE_URL}/upload/logo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },
};

// Zones
export interface Zone {
  id: string;
  name: string;
  description?: string;
  type: 'entrance' | 'stage' | 'vip' | 'backstage' | 'camping' | 'food' | 'parking';
  festivalId: string;
  festival?: { id: string; name: string };
  capacity: number;
  currentOccupancy: number;
  accessLevel: 'public' | 'ticket' | 'vip' | 'staff' | 'artist';
  checkpoints?: { id: string; name: string }[];
  status: 'active' | 'inactive' | 'full';
  createdAt: string;
  updatedAt?: string;
}

export interface AccessLog {
  id: string;
  zoneId: string;
  zone?: { id: string; name: string };
  userId: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  ticketId?: string;
  ticket?: { ticketNumber: string };
  action: 'entry' | 'exit';
  timestamp: string;
  checkpointId?: string;
  checkpoint?: { id: string; name: string };
}

export const zonesApi = {
  getAll: (params?: { festivalId?: string; type?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.festivalId) {
      searchParams.set('festivalId', params.festivalId);
    }
    if (params?.type) {
      searchParams.set('type', params.type);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    return request<Zone[]>(`/zones?${searchParams.toString()}`);
  },
  getByFestival: (festivalId: string) => request<Zone[]>(`/festivals/${festivalId}/zones`),
  getById: (id: string) => request<Zone>(`/zones/${id}`),
  create: (festivalId: string, data: Partial<Zone>) =>
    request<Zone>(`/festivals/${festivalId}/zones`, { method: 'POST', body: data }),
  update: (id: string, data: Partial<Zone>) =>
    request<Zone>(`/zones/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<void>(`/zones/${id}`, { method: 'DELETE' }),
  getAccessLogs: (params?: {
    zoneId?: string;
    festivalId?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.zoneId) {
      searchParams.set('zoneId', params.zoneId);
    }
    if (params?.festivalId) {
      searchParams.set('festivalId', params.festivalId);
    }
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    return request<import('../types').PaginatedResponse<AccessLog>>(
      `/zones/access-logs?${searchParams.toString()}`
    );
  },
  getOccupancy: (festivalId: string) =>
    request<Record<string, { current: number; capacity: number; percentage: number }>>(
      `/festivals/${festivalId}/zones/occupancy`
    ),
};

// Cashless
export interface CashlessAccount {
  id: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  festivalId: string;
  festival?: { id: string; name: string };
  balance: number;
  totalTopUp: number;
  totalSpent: number;
  nfcTagId?: string;
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  lastTransaction?: string;
}

export interface CashlessTransaction {
  id: string;
  accountId: string;
  account?: { id: string; user?: { firstName: string; lastName: string; email: string } };
  type: 'topup' | 'payment' | 'refund' | 'transfer';
  amount: number;
  vendorId?: string;
  vendor?: { id: string; name: string };
  description?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface CashlessStats {
  totalBalance: number;
  totalTopUp: number;
  totalSpent: number;
  activeAccounts: number;
  transactionsToday: number;
  volumeToday: number;
}

export const cashlessApi = {
  getAccounts: (params?: {
    festivalId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.festivalId) {
      searchParams.set('festivalId', params.festivalId);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    return request<import('../types').PaginatedResponse<CashlessAccount>>(
      `/cashless/accounts?${searchParams.toString()}`
    );
  },
  getAccountById: (id: string) => request<CashlessAccount>(`/cashless/accounts/${id}`),
  getTransactions: (params?: {
    accountId?: string;
    festivalId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.accountId) {
      searchParams.set('accountId', params.accountId);
    }
    if (params?.festivalId) {
      searchParams.set('festivalId', params.festivalId);
    }
    if (params?.type) {
      searchParams.set('type', params.type);
    }
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    return request<import('../types').PaginatedResponse<CashlessTransaction>>(
      `/cashless/transactions?${searchParams.toString()}`
    );
  },
  getStats: (festivalId?: string) => {
    const endpoint = festivalId ? `/cashless/stats?festivalId=${festivalId}` : '/cashless/stats';
    return request<CashlessStats>(endpoint);
  },
  getHourlyData: (festivalId: string, date?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('festivalId', festivalId);
    if (date) {
      searchParams.set('date', date);
    }
    return request<{ hour: string; transactions: number; amount: number }[]>(
      `/cashless/hourly?${searchParams.toString()}`
    );
  },
  getVendorBreakdown: (festivalId: string) =>
    request<{ vendorId: string; vendorName: string; amount: number }[]>(
      `/cashless/vendors?festivalId=${festivalId}`
    ),
  suspendAccount: (id: string) =>
    request<CashlessAccount>(`/cashless/accounts/${id}/suspend`, { method: 'POST' }),
  activateAccount: (id: string) =>
    request<CashlessAccount>(`/cashless/accounts/${id}/activate`, { method: 'POST' }),
  refundBalance: (id: string) =>
    request<CashlessTransaction>(`/cashless/accounts/${id}/refund`, { method: 'POST' }),
};

// Notifications
export interface AdminNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'system' | 'sales' | 'security' | 'support' | 'festival';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    system: boolean;
    sales: boolean;
    security: boolean;
    support: boolean;
    festival: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const notificationsApi = {
  getAll: (params?: { read?: boolean; category?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.read !== undefined) {
      searchParams.set('read', params.read.toString());
    }
    if (params?.category) {
      searchParams.set('category', params.category);
    }
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    return request<import('../types').PaginatedResponse<AdminNotification>>(
      `/notifications?${searchParams.toString()}`
    );
  },
  getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markAsRead: (ids: string[]) =>
    request<void>('/notifications/mark-read', { method: 'POST', body: { ids } }),
  markAllAsRead: () => request<void>('/notifications/mark-all-read', { method: 'POST' }),
  delete: (ids: string[]) => request<void>('/notifications', { method: 'DELETE', body: { ids } }),
  getPreferences: () => request<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (preferences: NotificationPreferences) =>
    request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: preferences,
    }),
};

// Activity Logs
export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  userRole: 'admin' | 'organizer' | 'staff' | 'user';
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'read' | 'login' | 'logout' | 'export' | 'import';
  resource: string;
  resourceType:
    | 'user'
    | 'festival'
    | 'ticket'
    | 'payment'
    | 'cashless'
    | 'zone'
    | 'staff'
    | 'vendor'
    | 'system';
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'pending';
  duration?: number;
}

export const activityApi = {
  getLogs: (params?: {
    actionType?: string;
    resourceType?: string;
    status?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.actionType) {
      searchParams.set('actionType', params.actionType);
    }
    if (params?.resourceType) {
      searchParams.set('resourceType', params.resourceType);
    }
    if (params?.status) {
      searchParams.set('status', params.status);
    }
    if (params?.userId) {
      searchParams.set('userId', params.userId);
    }
    if (params?.dateFrom) {
      searchParams.set('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      searchParams.set('dateTo', params.dateTo);
    }
    if (params?.page) {
      searchParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    return request<import('../types').PaginatedResponse<ActivityLog>>(
      `/activity-logs?${searchParams.toString()}`
    );
  },
  getStats: () =>
    request<{
      total: number;
      today: number;
      failures: number;
      byActionType: Record<string, number>;
    }>('/activity-logs/stats'),
};

// Analytics / Dashboard
export interface RealtimeStats {
  ticketsSoldToday: number;
  revenueToday: number;
  currentAttendees: number;
  cashlessBalance: number;
  zoneOccupancy: Record<
    string,
    {
      zoneId: string;
      zoneName: string;
      current: number;
      capacity: number;
      percentage: number;
      status: string;
      trend: string;
      entriesLastHour: number;
      exitsLastHour: number;
    }
  >;
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    timestamp: string;
  }[];
}

export const analyticsApi = {
  getDashboardStats: () => request<import('../types').DashboardStats>('/analytics/dashboard'),
  getRealtimeStats: (festivalId?: string) => {
    const endpoint = festivalId
      ? `/analytics/realtime?festivalId=${festivalId}`
      : '/analytics/realtime';
    return request<RealtimeStats>(endpoint);
  },
  getRevenueChart: (period: 'week' | 'month' | 'quarter' | 'year', festivalId?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('period', period);
    if (festivalId) {
      searchParams.set('festivalId', festivalId);
    }
    return request<import('../types').ChartDataPoint[]>(
      `/analytics/revenue?${searchParams.toString()}`
    );
  },
  getTicketSalesChart: (period: 'week' | 'month' | 'quarter' | 'year', festivalId?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('period', period);
    if (festivalId) {
      searchParams.set('festivalId', festivalId);
    }
    return request<import('../types').ChartDataPoint[]>(
      `/analytics/ticket-sales?${searchParams.toString()}`
    );
  },
};

// Axios-style API wrapper for generic requests
const api = {
  get: async <T = unknown>(endpoint: string): Promise<{ data: T }> => {
    const data = await request<T>(endpoint);
    return { data };
  },
  post: async <T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> => {
    const data = await request<T>(endpoint, { method: 'POST', body });
    return { data };
  },
  put: async <T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> => {
    const data = await request<T>(endpoint, { method: 'PUT', body });
    return { data };
  },
  patch: async <T = unknown>(endpoint: string, body?: unknown): Promise<{ data: T }> => {
    const data = await request<T>(endpoint, { method: 'PATCH', body });
    return { data };
  },
  delete: async <T = unknown>(endpoint: string): Promise<{ data: T }> => {
    const data = await request<T>(endpoint, { method: 'DELETE' });
    return { data };
  },
};

export default api;
