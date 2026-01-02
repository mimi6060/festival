import { useProgramStore } from '../store/programStore';
import { useTicketStore } from '../store/ticketStore';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import type { ProgramEvent, Ticket, Transaction } from '../types';

// Demo program events
const demoEvents: ProgramEvent[] = [
  {
    id: '1',
    artist: { id: 'a1', name: 'The Midnight', genre: 'Synthwave', image: '' },
    stage: { id: 's1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '21:00',
    endTime: '22:30',
    day: 'Vendredi',
    isFavorite: true,
  },
  {
    id: '2',
    artist: { id: 'a2', name: 'Daft Punk Tribute', genre: 'Electronic', image: '' },
    stage: { id: 's2', name: 'Electric Tent', location: 'East', capacity: 5000 },
    startTime: '23:00',
    endTime: '00:30',
    day: 'Vendredi',
    isFavorite: false,
  },
  {
    id: '3',
    artist: { id: 'a3', name: 'Justice', genre: 'Electronic', image: '' },
    stage: { id: 's1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '19:00',
    endTime: '20:30',
    day: 'Samedi',
    isFavorite: true,
  },
  {
    id: '4',
    artist: { id: 'a4', name: 'Kavinsky', genre: 'Synthwave', image: '' },
    stage: { id: 's3', name: 'Sunset Stage', location: 'West', capacity: 3000 },
    startTime: '18:00',
    endTime: '19:30',
    day: 'Samedi',
    isFavorite: false,
  },
  {
    id: '5',
    artist: { id: 'a5', name: 'Carpenter Brut', genre: 'Darksynth', image: '' },
    stage: { id: 's2', name: 'Electric Tent', location: 'East', capacity: 5000 },
    startTime: '22:00',
    endTime: '23:30',
    day: 'Samedi',
    isFavorite: true,
  },
  {
    id: '6',
    artist: { id: 'a6', name: 'Perturbator', genre: 'Darksynth', image: '' },
    stage: { id: 's1', name: 'Main Stage', location: 'North', capacity: 10000 },
    startTime: '20:00',
    endTime: '21:30',
    day: 'Dimanche',
    isFavorite: false,
  },
];

// Demo tickets
const demoTickets: Ticket[] = [
  {
    id: 't1',
    festivalId: 'f1',
    festivalName: 'Synthwave Festival 2024',
    type: 'pass_3_jours',
    typeName: 'Pass 3 Jours',
    price: 150,
    status: 'valid',
    qrCode: 'SYNTH-2024-001-ABCD',
    purchaseDate: '2024-01-15T10:30:00Z',
    validFrom: '2024-07-12T00:00:00Z',
    validUntil: '2024-07-14T23:59:59Z',
  },
  {
    id: 't2',
    festivalId: 'f1',
    festivalName: 'Synthwave Festival 2024',
    type: 'camping',
    typeName: 'Pass Camping',
    price: 50,
    status: 'valid',
    qrCode: 'SYNTH-2024-CAMP-XYZ',
    purchaseDate: '2024-01-15T10:30:00Z',
    validFrom: '2024-07-11T14:00:00Z',
    validUntil: '2024-07-15T12:00:00Z',
  },
];

// Demo transactions
const demoTransactions: Transaction[] = [
  {
    id: 'tx1',
    type: 'topup',
    amount: 50,
    description: 'Rechargement CB',
    date: '2024-07-12T14:30:00Z',
    status: 'completed',
  },
  {
    id: 'tx2',
    type: 'payment',
    amount: -8.5,
    description: 'Burger & Frites - Food Corner',
    date: '2024-07-12T19:45:00Z',
    status: 'completed',
  },
  {
    id: 'tx3',
    type: 'payment',
    amount: -6,
    description: 'Bière artisanale - Beer Garden',
    date: '2024-07-12T20:30:00Z',
    status: 'completed',
  },
  {
    id: 'tx4',
    type: 'payment',
    amount: -25,
    description: 'T-Shirt officiel - Merch Stand',
    date: '2024-07-12T21:15:00Z',
    status: 'completed',
  },
];

// Initialize demo data if stores are empty
export const initializeDemoData = () => {
  const programStore = useProgramStore.getState();
  const ticketStore = useTicketStore.getState();
  const walletStore = useWalletStore.getState();
  const authStore = useAuthStore.getState();

  // Set demo user if not logged in
  if (!authStore.isAuthenticated) {
    authStore.setUser({
      id: 'demo-user',
      email: 'festivalier@demo.com',
      firstName: 'Festivalier',
      lastName: 'Demo',
      role: 'user',
    });
    authStore.setHasSeenOnboarding(true);
  }

  // Initialize program if empty
  if (programStore.events.length === 0) {
    programStore.syncProgram(demoEvents, [], []);
  }

  // Initialize tickets if empty
  if (ticketStore.tickets.length === 0) {
    ticketStore.syncTickets(demoTickets);
  }

  // Initialize wallet if balance is 0
  if (walletStore.balance.available === 0) {
    walletStore.setBalance({ available: 10.5, pending: 0, currency: 'EUR' });
    walletStore.setTransactions(demoTransactions);
  }
};

export default initializeDemoData;
