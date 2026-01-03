// Mock data for development and demonstration

import type {
  User,
  Festival,
  TicketCategory,
  Order,
  Payment,
  Staff,
  DashboardStats,
  ChartDataPoint,
} from '../types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@festival.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jean',
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2025-01-02T08:30:00Z',
    isActive: true,
  },
  {
    id: '2',
    email: 'marie@festival.com',
    firstName: 'Marie',
    lastName: 'Martin',
    role: 'organizer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marie',
    createdAt: '2024-02-20T14:30:00Z',
    lastLogin: '2025-01-01T16:45:00Z',
    isActive: true,
  },
  {
    id: '3',
    email: 'pierre@festival.com',
    firstName: 'Pierre',
    lastName: 'Bernard',
    role: 'staff',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pierre',
    createdAt: '2024-03-10T09:15:00Z',
    lastLogin: '2024-12-28T11:20:00Z',
    isActive: true,
  },
  {
    id: '4',
    email: 'sophie@email.com',
    firstName: 'Sophie',
    lastName: 'Petit',
    role: 'user',
    createdAt: '2024-06-05T18:00:00Z',
    lastLogin: '2024-12-30T20:10:00Z',
    isActive: true,
  },
  {
    id: '5',
    email: 'lucas@email.com',
    firstName: 'Lucas',
    lastName: 'Moreau',
    role: 'user',
    createdAt: '2024-07-12T12:45:00Z',
    isActive: false,
  },
];

// Mock Festivals
export const mockFestivals: Festival[] = [
  {
    id: 'electric-dreams-2025',
    name: 'Electric Dreams 2025',
    slug: 'electric-dreams-2025',
    description: 'Le festival electro le plus innovant de l\'annee. Experience immersive avec mapping 3D, installations artistiques et les meilleurs artistes de la scene electronique mondiale.',
    startDate: '2025-08-20T16:00:00Z',
    endDate: '2025-08-23T06:00:00Z',
    location: {
      name: 'Domaine de Chambord',
      address: 'Chateau de Chambord',
      city: 'Chambord',
      country: 'France',
      coordinates: { lat: 47.616, lng: 1.517 },
    },
    status: 'published',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    organizerId: '1',
    capacity: 40000,
    ticketsSold: 28500,
    revenue: 1995000,
    createdAt: '2024-09-15T10:00:00Z',
    updatedAt: '2025-01-03T09:00:00Z',
  },
  {
    id: '1',
    name: 'Summer Beats Festival',
    slug: 'summer-beats-festival-2025',
    description: 'Le plus grand festival de musique electronique de France. 3 jours de fete non-stop avec les meilleurs DJs internationaux.',
    startDate: '2025-07-15T14:00:00Z',
    endDate: '2025-07-17T23:59:00Z',
    location: {
      name: 'Parc des Expositions',
      address: '1 Place de la Porte de Versailles',
      city: 'Paris',
      country: 'France',
      coordinates: { lat: 48.832, lng: 2.288 },
    },
    status: 'published',
    coverImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    organizerId: '2',
    capacity: 50000,
    ticketsSold: 35420,
    revenue: 2125200,
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2025-01-02T09:00:00Z',
  },
  {
    id: '2',
    name: 'Jazz in the Park',
    slug: 'jazz-in-the-park-2025',
    description: 'Une experience jazz unique en plein air avec des artistes de renommee mondiale.',
    startDate: '2025-06-20T18:00:00Z',
    endDate: '2025-06-22T23:00:00Z',
    location: {
      name: 'Parc de la Tete dOr',
      address: 'Boulevard des Belges',
      city: 'Lyon',
      country: 'France',
      coordinates: { lat: 45.781, lng: 4.856 },
    },
    status: 'published',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
    organizerId: '2',
    capacity: 15000,
    ticketsSold: 8750,
    revenue: 437500,
    createdAt: '2024-11-15T14:00:00Z',
    updatedAt: '2025-01-01T16:30:00Z',
  },
  {
    id: '3',
    name: 'Rock Revolution',
    slug: 'rock-revolution-2025',
    description: 'Le retour du rock avec les legendes et les nouvelles stars du genre.',
    startDate: '2025-08-10T15:00:00Z',
    endDate: '2025-08-12T23:00:00Z',
    location: {
      name: 'Stade de France',
      address: '93216 Saint-Denis',
      city: 'Saint-Denis',
      country: 'France',
      coordinates: { lat: 48.924, lng: 2.360 },
    },
    status: 'draft',
    coverImage: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
    organizerId: '1',
    capacity: 80000,
    ticketsSold: 0,
    revenue: 0,
    createdAt: '2024-12-20T11:00:00Z',
    updatedAt: '2024-12-28T15:00:00Z',
  },
  {
    id: '4',
    name: 'Electro Beach 2024',
    slug: 'electro-beach-2024',
    description: 'Festival de musique electronique sur la plage.',
    startDate: '2024-08-05T16:00:00Z',
    endDate: '2024-08-07T04:00:00Z',
    location: {
      name: 'Plage du Prado',
      address: 'Avenue du Prado',
      city: 'Marseille',
      country: 'France',
    },
    status: 'completed',
    coverImage: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800',
    organizerId: '2',
    capacity: 30000,
    ticketsSold: 28500,
    revenue: 1425000,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-08-08T10:00:00Z',
  },
];

// Mock Ticket Categories
export const mockTicketCategories: TicketCategory[] = [
  // Electric Dreams 2025
  {
    id: 'ed-1day',
    festivalId: 'electric-dreams-2025',
    name: 'Pass 1 Jour',
    description: 'Acces pour une journee au choix',
    price: 55,
    currency: 'EUR',
    quantity: 15000,
    sold: 11200,
    maxPerOrder: 4,
    salesStart: '2024-11-01T00:00:00Z',
    salesEnd: '2025-08-19T23:59:00Z',
    isActive: true,
    benefits: ['Acces aux scenes principales', 'Acces aux installations artistiques'],
  },
  {
    id: 'ed-4days',
    festivalId: 'electric-dreams-2025',
    name: 'Pass 4 Jours',
    description: 'Acces complet aux 4 jours du festival',
    price: 180,
    currency: 'EUR',
    quantity: 12000,
    sold: 9800,
    maxPerOrder: 4,
    salesStart: '2024-11-01T00:00:00Z',
    salesEnd: '2025-08-19T23:59:00Z',
    isActive: true,
    benefits: ['Acces aux scenes principales', 'Acces camping', 'Espace detente VIP'],
  },
  {
    id: 'ed-vip',
    festivalId: 'electric-dreams-2025',
    name: 'Pass Platinum',
    description: 'Experience ultime avec acces backstage et services premium',
    price: 450,
    currency: 'EUR',
    quantity: 500,
    sold: 380,
    maxPerOrder: 2,
    salesStart: '2024-11-01T00:00:00Z',
    salesEnd: '2025-08-15T23:59:00Z',
    isActive: true,
    benefits: [
      'Acces aux scenes principales',
      'Acces backstage exclusif',
      'Open bar premium',
      'Glamping 4*',
      'Navette privee',
    ],
  },
  // Summer Beats
  {
    id: '1',
    festivalId: '1',
    name: 'Pass 1 Jour',
    description: 'Acces pour une journee au choix',
    price: 45,
    currency: 'EUR',
    quantity: 20000,
    sold: 15230,
    maxPerOrder: 4,
    salesStart: '2024-12-01T00:00:00Z',
    salesEnd: '2025-07-14T23:59:00Z',
    isActive: true,
    benefits: ['Acces aux scenes principales', 'Acces aux food trucks'],
  },
  {
    id: '2',
    festivalId: '1',
    name: 'Pass 3 Jours',
    description: 'Acces complet aux 3 jours du festival',
    price: 120,
    currency: 'EUR',
    quantity: 15000,
    sold: 12500,
    maxPerOrder: 4,
    salesStart: '2024-12-01T00:00:00Z',
    salesEnd: '2025-07-14T23:59:00Z',
    isActive: true,
    benefits: ['Acces aux scenes principales', 'Acces aux food trucks', 'Espace detente'],
  },
  {
    id: '3',
    festivalId: '1',
    name: 'Pass VIP',
    description: 'Experience premium avec acces aux backstages',
    price: 299,
    currency: 'EUR',
    quantity: 1000,
    sold: 750,
    maxPerOrder: 2,
    salesStart: '2024-12-01T00:00:00Z',
    salesEnd: '2025-07-10T23:59:00Z',
    isActive: true,
    benefits: [
      'Acces aux scenes principales',
      'Acces VIP backstage',
      'Open bar premium',
      'Meet & Greet artistes',
      'Parking VIP',
    ],
  },
  {
    id: '4',
    festivalId: '2',
    name: 'Entree Simple',
    description: 'Acces pour une soiree',
    price: 35,
    currency: 'EUR',
    quantity: 5000,
    sold: 4200,
    maxPerOrder: 6,
    salesStart: '2025-01-01T00:00:00Z',
    salesEnd: '2025-06-19T23:59:00Z',
    isActive: true,
  },
  {
    id: '5',
    festivalId: '2',
    name: 'Pass Weekend',
    description: 'Acces aux 3 soirees',
    price: 85,
    currency: 'EUR',
    quantity: 3000,
    sold: 2100,
    maxPerOrder: 4,
    salesStart: '2025-01-01T00:00:00Z',
    salesEnd: '2025-06-19T23:59:00Z',
    isActive: true,
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalFestivals: 12,
  activeFestivals: 3,
  totalUsers: 45280,
  newUsersThisMonth: 2340,
  totalRevenue: 4250000,
  revenueThisMonth: 523000,
  totalTicketsSold: 89500,
  ticketsSoldThisMonth: 12300,
};

// Generate revenue chart data
export function generateRevenueChartData(days: number = 30): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate somewhat realistic revenue data with weekend peaks
    const dayOfWeek = date.getDay();
    const baseRevenue = 15000 + Math.random() * 5000;
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.5 : 1;
    const trendMultiplier = 1 + (days - i) * 0.01; // Slight upward trend

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.round(baseRevenue * weekendMultiplier * trendMultiplier),
    });
  }

  return data;
}

// Generate ticket sales chart data
export function generateTicketSalesChartData(days: number = 30): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const baseSales = 300 + Math.random() * 100;
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.8 : 1;

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.round(baseSales * weekendMultiplier),
    });
  }

  return data;
}

// Mock recent orders
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-001234',
    userId: '4',
    festivalId: '1',
    items: [
      { id: '1', categoryId: '2', quantity: 2, unitPrice: 120, total: 240 },
    ],
    subtotal: 240,
    fees: 12,
    total: 252,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'card',
    paymentIntentId: 'pi_xxx123',
    createdAt: '2025-01-02T10:30:00Z',
    paidAt: '2025-01-02T10:31:00Z',
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-001235',
    userId: '5',
    festivalId: '1',
    items: [
      { id: '2', categoryId: '3', quantity: 1, unitPrice: 299, total: 299 },
    ],
    subtotal: 299,
    fees: 15,
    total: 314,
    currency: 'EUR',
    status: 'completed',
    paymentMethod: 'card',
    createdAt: '2025-01-02T11:15:00Z',
    paidAt: '2025-01-02T11:16:00Z',
  },
  {
    id: '3',
    orderNumber: 'ORD-2025-001236',
    userId: '4',
    festivalId: '2',
    items: [
      { id: '3', categoryId: '5', quantity: 2, unitPrice: 85, total: 170 },
    ],
    subtotal: 170,
    fees: 8.5,
    total: 178.5,
    currency: 'EUR',
    status: 'pending',
    paymentMethod: 'card',
    createdAt: '2025-01-02T12:00:00Z',
  },
];

// Mock payments
export const mockPayments: Payment[] = [
  {
    id: '1',
    orderId: '1',
    amount: 252,
    currency: 'EUR',
    status: 'succeeded',
    provider: 'stripe',
    providerTransactionId: 'ch_xxx123',
    createdAt: '2025-01-02T10:31:00Z',
    completedAt: '2025-01-02T10:31:05Z',
  },
  {
    id: '2',
    orderId: '2',
    amount: 314,
    currency: 'EUR',
    status: 'succeeded',
    provider: 'stripe',
    providerTransactionId: 'ch_xxx124',
    createdAt: '2025-01-02T11:16:00Z',
    completedAt: '2025-01-02T11:16:03Z',
  },
  {
    id: '3',
    orderId: '3',
    amount: 178.5,
    currency: 'EUR',
    status: 'pending',
    provider: 'stripe',
    providerTransactionId: 'pi_xxx125',
    createdAt: '2025-01-02T12:00:00Z',
  },
];

// Mock staff
export const mockStaff: Staff[] = [
  {
    id: '1',
    userId: '3',
    festivalId: '1',
    role: 'manager',
    permissions: ['all'],
    assignedAt: '2024-12-01T10:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    userId: '3',
    festivalId: '1',
    role: 'ticket_scanner',
    permissions: ['scan_tickets', 'view_attendees'],
    assignedAt: '2024-12-15T14:00:00Z',
    isActive: true,
  },
];

// Helper to get user by ID
export function getUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id);
}

// Helper to get festival by ID
export function getFestivalById(id: string): Festival | undefined {
  return mockFestivals.find((f) => f.id === id);
}

// Helper to get categories by festival
export function getCategoriesByFestival(festivalId: string): TicketCategory[] {
  return mockTicketCategories.filter((c) => c.festivalId === festivalId);
}
