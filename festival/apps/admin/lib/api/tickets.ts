import { get, post, put, del } from '../api-client';
import type { PaginatedResponse } from './festivals';

// Types
export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  soldCount: number;
  availableFrom: string;
  availableUntil: string;
  maxPerUser: number;
  isActive: boolean;
  accessLevel: AccessLevel;
  benefits?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AccessLevel = 'GENERAL' | 'VIP' | 'BACKSTAGE' | 'ALL_ACCESS';

export interface CreateTicketCategoryData {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity: number;
  availableFrom: string;
  availableUntil: string;
  maxPerUser?: number;
  isActive?: boolean;
  accessLevel?: AccessLevel;
  benefits?: string[];
}

export interface UpdateTicketCategoryData extends Partial<CreateTicketCategoryData> {}

export interface Ticket {
  id: string;
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  status: TicketStatus;
  price: number;
  currency: string;
  purchasedAt: string;
  validatedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  category?: TicketCategory;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type TicketStatus = 'PENDING' | 'ACTIVE' | 'USED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export interface TicketQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  categoryId?: string;
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TicketStats {
  totalSold: number;
  totalRevenue: number;
  totalValidated: number;
  totalCancelled: number;
  totalRefunded: number;
  byCategory: {
    categoryId: string;
    categoryName: string;
    sold: number;
    validated: number;
    revenue: number;
  }[];
}

// Ticket Categories API Functions

/**
 * Get all ticket categories for a festival
 */
export async function getTicketCategories(festivalId: string): Promise<TicketCategory[]> {
  return get<TicketCategory[]>(`/festivals/${festivalId}/ticket-categories`);
}

/**
 * Get a single ticket category by ID
 */
export async function getTicketCategory(categoryId: string): Promise<TicketCategory> {
  return get<TicketCategory>(`/ticket-categories/${categoryId}`);
}

/**
 * Create a new ticket category for a festival
 */
export async function createCategory(festivalId: string, data: CreateTicketCategoryData): Promise<TicketCategory> {
  return post<TicketCategory>(`/festivals/${festivalId}/ticket-categories`, data);
}

/**
 * Update an existing ticket category
 */
export async function updateCategory(categoryId: string, data: UpdateTicketCategoryData): Promise<TicketCategory> {
  return put<TicketCategory>(`/ticket-categories/${categoryId}`, data);
}

/**
 * Delete a ticket category
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  return del<void>(`/ticket-categories/${categoryId}`);
}

/**
 * Activate a ticket category
 */
export async function activateCategory(categoryId: string): Promise<TicketCategory> {
  return post<TicketCategory>(`/ticket-categories/${categoryId}/activate`);
}

/**
 * Deactivate a ticket category
 */
export async function deactivateCategory(categoryId: string): Promise<TicketCategory> {
  return post<TicketCategory>(`/ticket-categories/${categoryId}/deactivate`);
}

// Tickets API Functions

/**
 * Get tickets for a festival with optional filtering
 */
export async function getTickets(festivalId: string, params?: TicketQueryParams): Promise<PaginatedResponse<Ticket>> {
  const queryParams: Record<string, string> = {};

  if (params?.page) queryParams.page = params.page.toString();
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.status) queryParams.status = params.status;
  if (params?.categoryId) queryParams.categoryId = params.categoryId;
  if (params?.userId) queryParams.userId = params.userId;
  if (params?.search) queryParams.search = params.search;
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  return get<PaginatedResponse<Ticket>>(`/festivals/${festivalId}/tickets`, queryParams);
}

/**
 * Get a single ticket by ID
 */
export async function getTicket(ticketId: string): Promise<Ticket> {
  return get<Ticket>(`/tickets/${ticketId}`);
}

/**
 * Validate a ticket (mark as used)
 */
export async function validateTicket(ticketId: string): Promise<Ticket> {
  return post<Ticket>(`/tickets/${ticketId}/validate`);
}

/**
 * Cancel a ticket
 */
export async function cancelTicket(ticketId: string, reason?: string): Promise<Ticket> {
  return post<Ticket>(`/tickets/${ticketId}/cancel`, { reason });
}

/**
 * Refund a ticket
 */
export async function refundTicket(ticketId: string): Promise<Ticket> {
  return post<Ticket>(`/tickets/${ticketId}/refund`);
}

/**
 * Get ticket statistics for a festival
 */
export async function getTicketStats(festivalId: string): Promise<TicketStats> {
  return get<TicketStats>(`/festivals/${festivalId}/ticket-stats`);
}

/**
 * Download QR code for a ticket
 */
export async function getTicketQrCode(ticketId: string): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api'}/tickets/${ticketId}/qr`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to download QR code');
  }
  return response.blob();
}

/**
 * Resend ticket email to user
 */
export async function resendTicketEmail(ticketId: string): Promise<void> {
  return post<void>(`/tickets/${ticketId}/resend-email`);
}
