// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

// Ticket types
export interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: 'standard' | 'vip' | 'backstage';
  price: number;
  qrCode: string;
  status: 'valid' | 'used' | 'expired' | 'cancelled';
  purchasedAt: string;
  seatInfo?: string;
}

// Wallet types
export interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'refund' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// Program types
export interface Artist {
  id: string;
  name: string;
  genre: string;
  image?: string;
  bio?: string;
}

export interface Stage {
  id: string;
  name: string;
  location: string;
  capacity: number;
}

export interface ProgramEvent {
  id: string;
  artist: Artist;
  stage: Stage;
  startTime: string;
  endTime: string;
  day: string;
  isFavorite?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'promo' | 'reminder';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  TicketDetail: { ticketId: string };
  Topup: undefined;
  Transactions: undefined;
  Map: { filter?: 'all' | 'stages' | 'food' | 'drinks' | 'services' | 'info' | 'emergency' };
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  HelpCenter: undefined;
  ContactUs: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Tickets: undefined;
  Wallet: undefined;
  Program: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
