/**
 * Tickets API
 */

import apiClient from '../api-client';

export interface Ticket {
  id: string;
  userId: string;
  festivalId: string;
  categoryId: string;
  orderId?: string;
  qrCode: string;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED';
  holderName?: string;
  holderEmail?: string;
  holderPhone?: string;
  price: number;
  currency: string;
  purchasedAt: string;
  validatedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseTicketsRequest {
  festivalId: string;
  categoryId: string;
  quantity: number;
  holderName?: string;
  holderEmail?: string;
  holderPhone?: string;
}

export interface PurchaseTicketsResponse {
  tickets: Ticket[];
  totalPrice: number;
  currency: string;
  orderId: string;
}

export interface TicketValidation {
  valid: boolean;
  ticket?: Ticket;
  message?: string;
  errors?: string[];
}

/**
 * Purchase tickets
 */
export const purchaseTickets = async (data: PurchaseTicketsRequest): Promise<PurchaseTicketsResponse> => {
  const response = await apiClient.post('/tickets/buy', data);
  return response.data;
};

/**
 * Get user's tickets
 */
export const getMyTickets = async (params?: {
  festivalId?: string;
  status?: string;
}): Promise<Ticket[]> => {
  const response = await apiClient.get('/tickets/me', { params });
  return response.data;
};

/**
 * Get ticket by ID
 */
export const getTicket = async (id: string): Promise<Ticket> => {
  const response = await apiClient.get(`/tickets/${id}`);
  return response.data;
};

/**
 * Validate ticket QR code
 */
export const validateTicket = async (qrCode: string): Promise<TicketValidation> => {
  const response = await apiClient.post('/tickets/validate', { qrCode });
  return response.data;
};

/**
 * Cancel ticket
 */
export const cancelTicket = async (id: string): Promise<{ message: string; refundAmount?: number }> => {
  const response = await apiClient.delete(`/tickets/${id}`);
  return response.data;
};

/**
 * Get ticket QR code image
 */
export const getTicketQrCode = async (id: string): Promise<Blob> => {
  const response = await apiClient.get(`/tickets/${id}/qr`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download ticket as PDF
 */
export const downloadTicketPdf = async (id: string): Promise<Blob> => {
  const response = await apiClient.get(`/tickets/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};
