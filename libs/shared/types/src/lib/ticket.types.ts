// Ticket-related types

import { BaseEntity } from './common.types';

export enum TicketStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  USED = 'used',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum TicketType {
  GENERAL = 'general',
  VIP = 'vip',
  BACKSTAGE = 'backstage',
  EARLY_BIRD = 'early_bird',
  GROUP = 'group',
  STUDENT = 'student',
}

export interface TicketCategory extends BaseEntity {
  eventId: string;
  name: string;
  type: TicketType;
  price: number;
  currency: string;
  quantity: number;
  soldCount: number;
  description?: string;
  benefits?: string[];
  saleStartDate: Date;
  saleEndDate: Date;
}

export interface Ticket extends BaseEntity {
  ticketCategoryId: string;
  eventId: string;
  userId: string;
  orderId: string;
  status: TicketStatus;
  qrCode: string;
  seatNumber?: string;
  checkedInAt?: Date;
}

export interface CreateTicketCategoryDto {
  eventId: string;
  name: string;
  type: TicketType;
  price: number;
  currency?: string;
  quantity: number;
  description?: string;
  benefits?: string[];
  saleStartDate: Date;
  saleEndDate: Date;
}

export interface Order extends BaseEntity {
  userId: string;
  tickets: Ticket[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentIntentId?: string;
  paidAt?: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export interface CreateOrderDto {
  items: {
    ticketCategoryId: string;
    quantity: number;
  }[];
}
