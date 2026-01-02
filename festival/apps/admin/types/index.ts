// Admin Dashboard Types

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'organizer' | 'staff' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    address: string;
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  coverImage?: string;
  organizerId: string;
  organizer?: User;
  capacity: number;
  ticketsSold: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategory {
  id: string;
  festivalId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  maxPerOrder: number;
  salesStart: string;
  salesEnd: string;
  isActive: boolean;
  benefits?: string[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  categoryId: string;
  category?: TicketCategory;
  festivalId: string;
  festival?: Festival;
  userId: string;
  user?: User;
  orderId: string;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  qrCode: string;
  purchasedAt: string;
  usedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  festivalId: string;
  festival?: Festival;
  items: OrderItem[];
  subtotal: number;
  fees: number;
  total: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string;
  paymentIntentId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface OrderItem {
  id: string;
  categoryId: string;
  category?: TicketCategory;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  orderId: string;
  order?: Order;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider: 'stripe' | 'paypal';
  providerTransactionId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface Staff {
  id: string;
  userId: string;
  user?: User;
  festivalId: string;
  festival?: Festival;
  role: 'manager' | 'security' | 'ticket_scanner' | 'info_desk' | 'volunteer';
  permissions: string[];
  assignedAt: string;
  isActive: boolean;
}

export interface DashboardStats {
  totalFestivals: number;
  activeFestivals: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  totalTicketsSold: number;
  ticketsSoldThisMonth: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueChartData {
  daily: ChartDataPoint[];
  monthly: ChartDataPoint[];
  byFestival: {
    festivalId: string;
    festivalName: string;
    revenue: number;
  }[];
}

export interface TicketSalesChartData {
  daily: ChartDataPoint[];
  byCategory: {
    categoryId: string;
    categoryName: string;
    sold: number;
    total: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  key: string;
  value: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
}
