/**
 * Festival Platform - Complete Database Seed
 *
 * This script populates the database with realistic French data for testing and development.
 * Run with: npx prisma db seed
 *
 * Features:
 * - Idempotent (can be run multiple times safely)
 * - Modular structure (separate functions for each entity type)
 * - Realistic French names and data
 * - Proper relationships between entities
 * - Progress logging
 * - Error handling
 */

import {
  PrismaClient,
  UserRole,
  UserStatus,
  FestivalStatus,
  TicketType,
  TicketStatus,
  PaymentStatus,
  PaymentProvider,
  TransactionType,
  VendorType,
  PoiType,
  SupportTicketStatus,
  Priority,
  LostItemStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  SEED_PASSWORD: 'Festival2025!',
  BCRYPT_ROUNDS: 10,
  USERS_COUNT: 55,
  TICKETS_COUNT: 550,
  ARTISTS_COUNT: 25,
  PERFORMANCES_COUNT: 120,
  TRANSACTIONS_COUNT: 250,
  PRODUCTS_COUNT: 60,
  STAFF_ASSIGNMENTS_COUNT: 35,
  FAQ_ITEMS_COUNT: 25,
  SUPPORT_TICKETS_COUNT: 15,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, CONFIG.BCRYPT_ROUNDS);
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateNFCTag(): string {
  return 'NFC-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

function generateQRCode(): string {
  return 'QR-' + crypto.randomBytes(16).toString('hex').toUpperCase();
}

function _generateOrderNumber(): string {
  return (
    'ORD-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    crypto.randomBytes(3).toString('hex').toUpperCase()
  );
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function _randomFutureDate(daysMin: number, daysMax: number): Date {
  const now = new Date();
  const days = randomInt(daysMin, daysMax);
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function randomPastDate(daysMin: number, daysMax: number): Date {
  const now = new Date();
  const days = randomInt(daysMin, daysMax);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Real Unsplash festival images
const FESTIVAL_IMAGES = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop', // Concert crowd
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop', // Rock stage
  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop', // Jazz performance
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop', // Metal concert
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop', // Festival lights
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop', // DJ set
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop', // Festival crowd
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop', // Stage lights
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&h=600&fit=crop', // Concert energy
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=600&fit=crop', // Electronic music
];

function getFestivalImageUrl(index: number): string {
  const imageIndex = index % FESTIVAL_IMAGES.length;
  return FESTIVAL_IMAGES[imageIndex];
}

function log(message: string, indent = 0): void {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${message}`);
}

function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function logStep(step: number, total: number, description: string): void {
  console.log(`\n[${step}/${total}] ${description}`);
}

// ============================================================================
// DATA POOLS - Realistic French Data
// ============================================================================

const FRENCH_FIRST_NAMES = [
  'Jean',
  'Pierre',
  'Marie',
  'Sophie',
  'Antoine',
  'Camille',
  'Lucas',
  'Emma',
  'Hugo',
  'Chloe',
  'Louis',
  'Lea',
  'Gabriel',
  'Manon',
  'Raphael',
  'Juliette',
  'Arthur',
  'Charlotte',
  'Jules',
  'Alice',
  'Adam',
  'Louise',
  'Ethan',
  'Sarah',
  'Nathan',
  'Ines',
  'Thomas',
  'Clemence',
  'Theo',
  'Oceane',
  'Mathis',
  'Jade',
  'Leo',
  'Lola',
  'Maxime',
  'Clara',
  'Alexandre',
  'Pauline',
  'Romain',
  'Julie',
  'Nicolas',
  'Laura',
  'Sebastien',
  'Marion',
  'Julien',
  'Margaux',
  'Benjamin',
  'Anais',
  'Florian',
  'Marine',
  'Quentin',
  'Elodie',
  'Kevin',
  'Audrey',
  'Dylan',
  'Melanie',
];

const FRENCH_LAST_NAMES = [
  'Martin',
  'Bernard',
  'Thomas',
  'Petit',
  'Robert',
  'Richard',
  'Durand',
  'Dubois',
  'Moreau',
  'Laurent',
  'Simon',
  'Michel',
  'Lefebvre',
  'Leroy',
  'Roux',
  'David',
  'Bertrand',
  'Morel',
  'Fournier',
  'Girard',
  'Bonnet',
  'Dupont',
  'Lambert',
  'Fontaine',
  'Rousseau',
  'Vincent',
  'Muller',
  'Lefevre',
  'Faure',
  'Andre',
  'Mercier',
  'Blanc',
  'Guerin',
  'Boyer',
  'Garnier',
  'Chevalier',
  'Francois',
  'Legrand',
  'Gauthier',
  'Garcia',
  'Perrin',
  'Robin',
  'Clement',
  'Morin',
  'Nicolas',
  'Henry',
  'Roussel',
  'Mathieu',
];

const FRENCH_CITIES = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
  { name: 'Lyon', lat: 45.764, lng: 4.8357 },
  { name: 'Toulouse', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', lat: 43.7102, lng: 7.262 },
  { name: 'Nantes', lat: 47.2184, lng: -1.5536 },
  { name: 'Bordeaux', lat: 44.8378, lng: -0.5792 },
  { name: 'Montpellier', lat: 43.6108, lng: 3.8767 },
  { name: 'Strasbourg', lat: 48.5734, lng: 7.7521 },
  { name: 'Lille', lat: 50.6292, lng: 3.0573 },
];

const FRENCH_PHONE_PREFIXES = ['06', '07'];

function randomPhoneNumber(): string {
  const prefix = randomElement(FRENCH_PHONE_PREFIXES);
  const number = String(randomInt(10000000, 99999999));
  return `+33${prefix.slice(1)}${number}`;
}

// ============================================================================
// FESTIVAL DATA
// ============================================================================

const FESTIVAL_DATA = [
  // Featured festivals from homepage mock data
  {
    name: 'Summer Vibes 2026',
    slug: 'summer-vibes-2026',
    description:
      "Le plus grand festival de musique electronique de l'ete. 3 jours de fete non-stop avec les meilleurs DJs internationaux.",
    location: 'Marseille, France',
    address: 'Plage du Prado, 13008 Marseille',
    city: FRENCH_CITIES[1], // Marseille
    status: FestivalStatus.PUBLISHED,
    daysOffset: 180, // ~6 months from now
    duration: 3,
    maxCapacity: 45000,
    genres: ['Electronic', 'House', 'Techno'],
    isFeatured: true,
    imageIndex: 0,
  },
  {
    name: 'Rock en Seine 2026',
    slug: 'rock-en-seine-2026',
    description:
      'Le festival rock incontournable de la rentree. Decouvrez les plus grands groupes de rock et indie.',
    location: 'Paris, France',
    address: 'Domaine national de Saint-Cloud, 92210 Saint-Cloud',
    city: FRENCH_CITIES[0], // Paris
    status: FestivalStatus.PUBLISHED,
    daysOffset: 210, // ~7 months from now
    duration: 3,
    maxCapacity: 40000,
    genres: ['Rock', 'Indie', 'Alternative'],
    isFeatured: true,
    imageIndex: 1,
  },
  {
    name: 'Jazz a Vienne 2026',
    slug: 'jazz-a-vienne-2026',
    description:
      'Festival de jazz de renommee mondiale dans le cadre unique du theatre antique de Vienne.',
    location: 'Vienne, France',
    address: 'Theatre Antique de Vienne, 38200 Vienne',
    city: FRENCH_CITIES[2], // Lyon area
    status: FestivalStatus.PUBLISHED,
    daysOffset: 160, // ~5 months from now
    duration: 16,
    maxCapacity: 8000,
    genres: ['Jazz', 'Blues', 'Soul'],
    isFeatured: false,
    imageIndex: 2,
  },
  {
    name: 'Hellfest 2026',
    slug: 'hellfest-2026',
    description:
      'Le plus grand festival de metal en France. Une experience unique pour les fans de musique extreme.',
    location: 'Clisson, France',
    address: 'Le Val de Moine, 44190 Clisson',
    city: FRENCH_CITIES[5], // Nantes area
    status: FestivalStatus.PUBLISHED,
    daysOffset: 150, // ~5 months from now
    duration: 4,
    maxCapacity: 60000,
    genres: ['Metal', 'Hard Rock', 'Punk'],
    isFeatured: true,
    imageIndex: 3,
  },
  {
    name: 'Les Vieilles Charrues 2026',
    slug: 'les-vieilles-charrues-2026',
    description:
      'Le plus grand festival de France en termes de frequentation. Un programme eclectique pour tous les gouts.',
    location: 'Carhaix, France',
    address: 'Site de Kerampuilh, 29270 Carhaix-Plouguer',
    city: { name: 'Carhaix', lat: 48.2758, lng: -3.5717 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 175, // ~6 months from now
    duration: 4,
    maxCapacity: 55000,
    genres: ['Pop', 'Rock', 'Electro', 'World'],
    isFeatured: false,
    imageIndex: 4,
  },
  {
    name: 'Solidays 2026',
    slug: 'solidays-2026',
    description:
      "Festival engage contre le SIDA. Musique, solidarite et bonne humeur a l'hippodrome de Longchamp.",
    location: 'Paris, France',
    address: "Hippodrome de Longchamp, 75016 Paris",
    city: FRENCH_CITIES[0], // Paris
    status: FestivalStatus.PUBLISHED,
    daysOffset: 155, // ~5 months from now
    duration: 3,
    maxCapacity: 45000,
    genres: ['Electro', 'Hip-Hop', 'Pop'],
    isFeatured: false,
    imageIndex: 5,
  },
  // Detail page mock festivals
  {
    name: 'Electric Dreams Festival',
    slug: 'electric-dreams-2025',
    description:
      'Experience the ultimate electronic music festival featuring world-renowned DJs and immersive art installations across 5 stages. Join us for 4 days of non-stop music, art, and unforgettable memories in the heart of Barcelona.',
    location: 'Barcelona, Spain',
    address: 'Parc del Forum, 08019 Barcelona',
    city: { name: 'Barcelona', lat: 41.4098, lng: 2.2201 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 170, // Future
    duration: 4,
    maxCapacity: 50000,
    genres: ['Electronic', 'House', 'Techno', 'Trance'],
    isFeatured: true,
    imageIndex: 0,
  },
  {
    name: 'Rock Revolution',
    slug: 'rock-revolution-2025',
    description:
      'The biggest rock festival in Europe with legendary headliners and emerging artists. Three days of pure rock energy featuring multiple stages and unforgettable performances.',
    location: 'London, UK',
    address: 'Olympic Park, London E20',
    city: { name: 'London', lat: 51.5425, lng: -0.0158 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 200, // Future
    duration: 3,
    maxCapacity: 65000,
    genres: ['Rock', 'Alternative', 'Metal'],
    isFeatured: false,
    imageIndex: 1,
  },
  {
    name: 'Summer Beats Festival',
    slug: 'summer-beats-2025',
    description:
      'A celebration of hip-hop, RnB, and urban music under the summer sun. Join us in Paris for three days of the hottest urban acts.',
    location: 'Paris, France',
    address: 'Parc de la Villette, 75019 Paris',
    city: FRENCH_CITIES[0], // Paris
    status: FestivalStatus.PUBLISHED,
    daysOffset: 155, // Future
    duration: 3,
    maxCapacity: 35000,
    genres: ['Hip-Hop', 'R&B', 'Urban'],
    isFeatured: false,
    imageIndex: 6,
  },
  {
    name: 'Jazz Nights',
    slug: 'jazz-nights-2025',
    description:
      'An intimate jazz experience in the heart of Amsterdam with international artists. Three nights of smooth jazz, soul, and blues.',
    location: 'Amsterdam, Netherlands',
    address: 'Vondelpark, Amsterdam',
    city: { name: 'Amsterdam', lat: 52.3583, lng: 4.8690 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 220, // Future
    duration: 3,
    maxCapacity: 5000,
    genres: ['Jazz', 'Soul', 'Blues'],
    isFeatured: false,
    imageIndex: 2,
  },
  {
    name: 'Indie Vibes',
    slug: 'indie-vibes-2025',
    description:
      'Discover the best indie and alternative artists in a beautiful coastal setting. Three days of unique sounds and ocean views in Lisbon.',
    location: 'Lisbon, Portugal',
    address: 'Praia de Carcavelos, Lisbon',
    city: { name: 'Lisbon', lat: 38.6751, lng: -9.3309 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 160, // Future
    duration: 3,
    maxCapacity: 25000,
    genres: ['Indie', 'Alternative', 'Folk'],
    isFeatured: false,
    imageIndex: 7,
  },
  {
    name: 'Tropical Bass Festival',
    slug: 'tropical-bass-2025',
    description:
      'Where electronic beats meet tropical vibes. Dance on the beach all day and night in the world capital of electronic music - Ibiza.',
    location: 'Ibiza, Spain',
    address: 'Playa den Bossa, Ibiza',
    city: { name: 'Ibiza', lat: 38.9067, lng: 1.4206 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 195, // Future
    duration: 5,
    maxCapacity: 15000,
    genres: ['Electronic', 'Tropical', 'Bass'],
    isFeatured: true,
    imageIndex: 8,
  },
  {
    name: 'Summer Vibes Festival',
    slug: 'summer-vibes-2025',
    description:
      'The ultimate summer music celebration featuring chart-topping artists across multiple genres. Experience three days of sun, music, and unforgettable moments in the beautiful city of Nice.',
    location: 'Nice, France',
    address: 'Promenade des Anglais, 06000 Nice',
    city: FRENCH_CITIES[4], // Nice
    status: FestivalStatus.PUBLISHED,
    daysOffset: 185, // Future
    duration: 3,
    maxCapacity: 40000,
    genres: ['Pop', 'Electronic', 'Hip-Hop', 'R&B'],
    isFeatured: true,
    imageIndex: 9,
  },
  // Original seed festivals (kept for backwards compatibility)
  {
    name: 'Les Nuits Electriques',
    slug: 'nuits-electriques-2024',
    description:
      'Le plus grand festival electro de France ! 3 jours de musique non-stop avec les meilleurs DJs internationaux. Ambiance exceptionnelle garantie sur la plage de Palavas-les-Flots.',
    location: 'Palavas-les-Flots',
    address: 'Plage du Grand Travers, 34250 Palavas-les-Flots',
    city: FRENCH_CITIES[7], // Montpellier area
    status: FestivalStatus.COMPLETED, // Past festival
    daysOffset: -60, // 60 days ago
    duration: 3,
    maxCapacity: 45000,
    genres: ['Electronic', 'House', 'Techno'],
    isFeatured: false,
    imageIndex: 0,
  },
  {
    name: 'Rock en Provence',
    slug: 'rock-provence-2025',
    description:
      'Festival rock et metal au coeur de la Provence. 4 scenes, 50 artistes, camping sur place. Une experience unique dans un cadre naturel exceptionnel.',
    location: 'Aix-en-Provence',
    address: 'Domaine de la Brillanne, 13100 Aix-en-Provence',
    city: FRENCH_CITIES[1], // Marseille area
    status: FestivalStatus.ONGOING, // Current festival
    daysOffset: -1, // Started yesterday
    duration: 4,
    maxCapacity: 35000,
    genres: ['Rock', 'Metal', 'Punk'],
    isFeatured: false,
    imageIndex: 1,
  },
  // ==========================================
  // FAMOUS WORLD FESTIVALS
  // ==========================================
  {
    name: 'Tomorrowland 2025',
    slug: 'tomorrowland-2025',
    description:
      "The world's biggest and most magical electronic music festival. Set in the fairy tale world of Boom, Belgium, Tomorrowland brings together 400,000 people of tomorrow for an unforgettable experience of music, art and magic.",
    location: 'Boom, Belgium',
    address: 'De Schorre Recreational Park, 2850 Boom, Belgium',
    city: { name: 'Boom', lat: 51.0903, lng: 4.3742 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 190,
    duration: 3,
    maxCapacity: 400000,
    genres: ['Electronic', 'House', 'Techno', 'Trance', 'EDM'],
    isFeatured: true,
    imageIndex: 5,
  },
  {
    name: 'Ultra Music Festival 2025',
    slug: 'ultra-miami-2025',
    description:
      'The premier electronic music festival in the world. Ultra Music Festival brings the biggest names in EDM to the heart of Miami for three days of non-stop music and entertainment.',
    location: 'Miami, USA',
    address: 'Bayfront Park, 301 Biscayne Blvd, Miami, FL 33132, USA',
    city: { name: 'Miami', lat: 25.7748, lng: -80.1870 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 60,
    duration: 3,
    maxCapacity: 165000,
    genres: ['Electronic', 'EDM', 'House', 'Techno'],
    isFeatured: true,
    imageIndex: 6,
  },
  {
    name: 'Coachella 2025',
    slug: 'coachella-2025',
    description:
      'The iconic California desert festival featuring the biggest names in music across all genres. Coachella is where music meets art, fashion, and unforgettable experiences under the California sun.',
    location: 'Indio, California, USA',
    address: 'Empire Polo Club, 81-800 Avenue 51, Indio, CA 92201, USA',
    city: { name: 'Indio', lat: 33.7206, lng: -116.2156 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 90,
    duration: 3,
    maxCapacity: 125000,
    genres: ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Indie'],
    isFeatured: true,
    imageIndex: 7,
  },
  {
    name: 'Rock en Seine 2025',
    slug: 'rock-en-seine-2025',
    description:
      'Le festival rock incontournable de la region parisienne. Installe dans le cadre unique du Domaine national de Saint-Cloud, Rock en Seine reunit chaque annee les plus grands noms du rock et de la musique alternative.',
    location: 'Paris, France',
    address: 'Domaine national de Saint-Cloud, 92210 Saint-Cloud',
    city: FRENCH_CITIES[0],
    status: FestivalStatus.PUBLISHED,
    daysOffset: 220,
    duration: 3,
    maxCapacity: 40000,
    genres: ['Rock', 'Alternative', 'Indie'],
    isFeatured: true,
    imageIndex: 1,
  },
  {
    name: 'Les Vieilles Charrues 2025',
    slug: 'vieilles-charrues-2025',
    description:
      'Le plus grand festival de musique en France en termes de frequentation. Au coeur de la Bretagne, Les Vieilles Charrues offrent une programmation eclectique qui seduit 280 000 festivaliers chaque annee.',
    location: 'Carhaix, France',
    address: 'Site de Kerampuilh, 29270 Carhaix-Plouguer',
    city: { name: 'Carhaix', lat: 48.2758, lng: -3.5717 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 180,
    duration: 4,
    maxCapacity: 280000,
    genres: ['Pop', 'Rock', 'Electro', 'World', 'Chanson'],
    isFeatured: true,
    imageIndex: 4,
  },
  {
    name: 'Hellfest 2025',
    slug: 'hellfest-2025',
    description:
      'Le plus grand festival de metal en Europe. Hellfest accueille les legendes du metal et du hard rock dans une ambiance unique a Clisson. Une experience extreme pour les passionnes de musique lourde.',
    location: 'Clisson, France',
    address: 'Le Val de Moine, 44190 Clisson',
    city: FRENCH_CITIES[5],
    status: FestivalStatus.PUBLISHED,
    daysOffset: 150,
    duration: 4,
    maxCapacity: 60000,
    genres: ['Metal', 'Hard Rock', 'Punk', 'Hardcore'],
    isFeatured: true,
    imageIndex: 3,
  },
  {
    name: 'Lollapalooza Paris 2025',
    slug: 'lollapalooza-paris-2025',
    description:
      'La version parisienne du legendaire festival americain. Lollapalooza Paris transforme lHippodrome de Longchamp en temple de la musique pop, rock et electro pendant deux jours memorables.',
    location: 'Paris, France',
    address: 'Hippodrome de Longchamp, 75016 Paris',
    city: FRENCH_CITIES[0],
    status: FestivalStatus.PUBLISHED,
    daysOffset: 200,
    duration: 2,
    maxCapacity: 70000,
    genres: ['Pop', 'Rock', 'Electronic', 'Hip-Hop'],
    isFeatured: false,
    imageIndex: 8,
  },
  {
    name: 'Main Square Festival 2025',
    slug: 'main-square-2025',
    description:
      'Le festival rock et pop du Nord de la France. Main Square Festival investit la Citadelle dArras pour trois jours de concerts exceptionnels dans un cadre historique unique.',
    location: 'Arras, France',
    address: 'Citadelle dArras, 62000 Arras',
    city: { name: 'Arras', lat: 50.2833, lng: 2.7833 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 165,
    duration: 3,
    maxCapacity: 40000,
    genres: ['Rock', 'Pop', 'Electronic'],
    isFeatured: false,
    imageIndex: 9,
  },
  {
    name: 'Solidays 2025',
    slug: 'solidays-2025',
    description:
      'Le festival engage de Solidarite Sida. Solidays combine musique et engagement solidaire a lHippodrome de Longchamp. Trois jours de fete pour une cause essentielle.',
    location: 'Paris, France',
    address: 'Hippodrome de Longchamp, 75016 Paris',
    city: FRENCH_CITIES[0],
    status: FestivalStatus.PUBLISHED,
    daysOffset: 155,
    duration: 3,
    maxCapacity: 228000,
    genres: ['Electro', 'Pop', 'Hip-Hop', 'Rock'],
    isFeatured: false,
    imageIndex: 5,
  },
  {
    name: 'Electrobeach 2025',
    slug: 'electrobeach-2025',
    description:
      'Le plus grand festival de musique electronique en plein air du Sud de la France. Electrobeach transforme la plage du Barcares en dance floor geant pour 100 000 festivaliers.',
    location: 'Le Barcares, France',
    address: 'Plage du Lido, 66420 Le Barcares',
    city: { name: 'Le Barcares', lat: 42.7908, lng: 3.0356 },
    status: FestivalStatus.PUBLISHED,
    daysOffset: 175,
    duration: 3,
    maxCapacity: 100000,
    genres: ['Electronic', 'EDM', 'House', 'Techno'],
    isFeatured: true,
    imageIndex: 0,
  },
];

// ============================================================================
// TICKET CATEGORIES
// ============================================================================

const TICKET_CATEGORIES = [
  {
    name: 'Pass 1 Jour - Vendredi',
    type: TicketType.STANDARD,
    price: 49.0,
    quota: 8000,
    maxPerUser: 6,
    description: 'Acces au festival le vendredi uniquement',
  },
  {
    name: 'Pass 1 Jour - Samedi',
    type: TicketType.STANDARD,
    price: 59.0,
    quota: 10000,
    maxPerUser: 6,
    description: 'Acces au festival le samedi uniquement',
  },
  {
    name: 'Pass 1 Jour - Dimanche',
    type: TicketType.STANDARD,
    price: 49.0,
    quota: 8000,
    maxPerUser: 6,
    description: 'Acces au festival le dimanche uniquement',
  },
  {
    name: 'Pass 3 Jours',
    type: TicketType.STANDARD,
    price: 139.0,
    quota: 20000,
    maxPerUser: 4,
    description: 'Acces complet aux 3 jours du festival',
  },
  {
    name: 'Pass 3 Jours - Early Bird',
    type: TicketType.STANDARD,
    price: 109.0,
    quota: 5000,
    maxPerUser: 2,
    description: 'Tarif reduit pour les premiers acheteurs',
  },
  {
    name: 'Pass VIP 1 Jour',
    type: TicketType.VIP,
    price: 149.0,
    quota: 1000,
    maxPerUser: 2,
    description: 'Acces VIP avec lounge et vue privilegiee',
  },
  {
    name: 'Pass VIP 3 Jours',
    type: TicketType.VIP,
    price: 349.0,
    quota: 2000,
    maxPerUser: 2,
    description: 'Experience VIP complete pour tout le festival',
  },
  {
    name: 'Pass Backstage',
    type: TicketType.BACKSTAGE,
    price: 899.0,
    quota: 100,
    maxPerUser: 1,
    description: 'Acces aux coulisses et rencontre avec les artistes',
  },
  {
    name: 'Pass Backstage Premium',
    type: TicketType.BACKSTAGE,
    price: 1499.0,
    quota: 50,
    maxPerUser: 1,
    description: 'Experience exclusive avec diner et artistes',
  },
  {
    name: 'Option Camping Standard',
    type: TicketType.CAMPING,
    price: 45.0,
    quota: 4000,
    maxPerUser: 2,
    description: 'Emplacement tente dans le camping festival',
  },
  {
    name: 'Option Camping Confort',
    type: TicketType.CAMPING,
    price: 89.0,
    quota: 1500,
    maxPerUser: 2,
    description: 'Emplacement premium avec acces douches',
  },
  {
    name: 'Pass Parking',
    type: TicketType.PARKING,
    price: 25.0,
    quota: 3000,
    maxPerUser: 2,
    description: 'Place de parking pour la duree du festival',
  },
  {
    name: 'Pack Festival + Camping',
    type: TicketType.COMBO,
    price: 175.0,
    quota: 3000,
    maxPerUser: 2,
    description: 'Pass 3 jours + camping standard',
  },
  {
    name: 'Pack VIP + Parking',
    type: TicketType.COMBO,
    price: 369.0,
    quota: 800,
    maxPerUser: 2,
    description: 'Pass VIP 3 jours + parking garanti',
  },
  {
    name: 'Pack Family (4 personnes)',
    type: TicketType.COMBO,
    price: 399.0,
    quota: 500,
    maxPerUser: 1,
    description: '4 pass 3 jours a tarif reduit',
  },
];

// ============================================================================
// ZONES
// ============================================================================

const ZONE_TEMPLATES = [
  {
    name: 'Scene Principale',
    description: 'La grande scene avec les tetes daffiche',
    capacity: 35000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Scene Electro',
    description: 'Scene dediee aux musiques electroniques',
    capacity: 12000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Scene Acoustique',
    description: 'Scene intimiste pour concerts unplugged',
    capacity: 3000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Scene Discovery',
    description: 'Decouvrez les artistes emergents',
    capacity: 5000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Scene DJ Set',
    description: 'DJ sets et after party',
    capacity: 8000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Espace VIP',
    description: 'Lounge VIP avec vue sur la scene principale',
    capacity: 2000,
    types: [TicketType.VIP, TicketType.BACKSTAGE],
  },
  {
    name: 'Backstage & Loges',
    description: 'Acces reserve artistes et passes backstage',
    capacity: 200,
    types: [TicketType.BACKSTAGE],
  },
  {
    name: 'Food Court Principal',
    description: 'Zone restauration avec 20 stands',
    capacity: 8000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Food Court VIP',
    description: 'Restauration gastronomique VIP',
    capacity: 500,
    types: [TicketType.VIP, TicketType.BACKSTAGE],
  },
  {
    name: 'Bar Central',
    description: 'Bar principal du festival',
    capacity: 3000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Zone Detente',
    description: 'Espace chill-out avec hamacs et poufs',
    capacity: 2000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
  {
    name: 'Camping Standard',
    description: 'Espace camping tentes',
    capacity: 4000,
    types: [TicketType.CAMPING, TicketType.COMBO],
  },
  {
    name: 'Camping Premium',
    description: 'Espace camping avec services',
    capacity: 1500,
    types: [TicketType.CAMPING],
  },
  {
    name: 'Parking Festival',
    description: 'Parking visiteurs',
    capacity: 3000,
    types: [TicketType.PARKING, TicketType.COMBO],
  },
  {
    name: 'Village Partenaires',
    description: 'Stands des sponsors et activations',
    capacity: 5000,
    types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE, TicketType.COMBO],
  },
];

// ============================================================================
// ARTISTS
// ============================================================================

const ARTIST_DATA = [
  {
    name: 'DJ Snake',
    genre: 'Electro / EDM',
    bio: 'DJ et producteur francais de renommee mondiale. Connu pour ses tubes comme "Turn Down for What" et "Lean On". Il a collabore avec les plus grands artistes internationaux.',
    imageUrl: 'https://example.com/artists/dj-snake.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/20s0P9QLxGqKuCsGwFsp7w',
    instagramUrl: 'https://instagram.com/djsnake',
  },
  {
    name: 'Christine and the Queens',
    genre: 'Pop / Art Pop',
    bio: 'Artiste francaise iconique melangeant pop, electro et performances theatrales. Ses albums "Chaleur humaine" et "Chris" ont revolutionne la pop francaise.',
    imageUrl: 'https://example.com/artists/christine.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/04vj3iPUiVh5melWr0w3xT',
    instagramUrl: 'https://instagram.com/christineandthequeens',
  },
  {
    name: 'PNL',
    genre: 'Rap / Cloud Rap',
    bio: 'Duo de rap francais compose des freres Ademo et N.O.S. Pionniers du cloud rap en France avec des albums comme "Dans la legende" et "Deux freres".',
    imageUrl: 'https://example.com/artists/pnl.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/5ZqnEfVdEGmoPxtELhN70N',
    instagramUrl: 'https://instagram.com/paborunknown',
  },
  {
    name: 'Angele',
    genre: 'Pop / Chanson',
    bio: 'Chanteuse belge qui a conquis la France avec son album "Brol". Sa musique pop aux textes engages a séduit des millions de fans.',
    imageUrl: 'https://example.com/artists/angele.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/3QVolfxzfthy5EMChhKhyT',
    instagramUrl: 'https://instagram.com/angele_vl',
  },
  {
    name: 'Orelsan',
    genre: 'Rap / Hip-Hop',
    bio: 'Rappeur et realisateur francais. Ses albums "La fete est finie" et "Civilisation" ont marque le rap francais contemporain.',
    imageUrl: 'https://example.com/artists/orelsan.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/4FpJcNgOvIpSBeJgRg3OfN',
    instagramUrl: 'https://instagram.com/olorelsan',
  },
  {
    name: 'Kungs',
    genre: 'House / Deep House',
    bio: 'DJ et producteur francais. Son remix de "This Girl" la propulse sur la scene internationale. Expert en house melodique.',
    imageUrl: 'https://example.com/artists/kungs.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/20gsENnposVs2I4rQ5kvrf',
    instagramUrl: 'https://instagram.com/kungs',
  },
  {
    name: 'Clara Luciani',
    genre: 'Pop / Chanson Francaise',
    bio: 'Chanteuse francaise revelee avec "La grenade". Son album "Coeur" a ete un succes commercial et critique.',
    imageUrl: 'https://example.com/artists/clara-luciani.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/3QLjPKGYelL7N4GE1efFMf',
    instagramUrl: 'https://instagram.com/claraluciani',
  },
  {
    name: 'Nekfeu',
    genre: 'Rap / Hip-Hop',
    bio: 'Rappeur et membre de 1995 et S-Crew. Ses albums solo comme "Feu" et "Cyborg" sont consideres comme des classiques du rap francais.',
    imageUrl: 'https://example.com/artists/nekfeu.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/0L7h0l5e5QBaSi1OXSBmQH',
    instagramUrl: 'https://instagram.com/nekfeumofaux',
  },
  {
    name: 'Petit Biscuit',
    genre: 'Electro / Tropical House',
    bio: 'Producteur francais prodige. A seulement 15 ans, il a sorti "Sunset Lover" qui a cumule des centaines de millions decoutes.',
    imageUrl: 'https://example.com/artists/petit-biscuit.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/4k1EleJKKluLKFYmUNlgkB',
    instagramUrl: 'https://instagram.com/petitbiscuit',
  },
  {
    name: 'Aya Nakamura',
    genre: 'Pop Urbaine / Afropop',
    bio: 'Chanteuse francaise dorigine malienne. "Djadja" est devenu un phenomene mondial et elle est lartiste francophone la plus ecoutee.',
    imageUrl: 'https://example.com/artists/aya-nakamura.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/39OUo0qbN8mqKwfBywAJvB',
    instagramUrl: 'https://instagram.com/aaborayanka',
  },
  {
    name: 'Woodkid',
    genre: 'Art Pop / Cinematic',
    bio: 'Auteur-compositeur et realisateur francais. Ses compositions epiques et cinematographiques ont marque la musique francaise.',
    imageUrl: 'https://example.com/artists/woodkid.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/2PFItCw0AkxaQZevJM1bdi',
    instagramUrl: 'https://instagram.com/woodkid',
  },
  {
    name: 'Polo & Pan',
    genre: 'Electro / French Touch',
    bio: 'Duo electro parisien. Leurs productions colorees et voyageuses ont conquis les festivals du monde entier.',
    imageUrl: 'https://example.com/artists/polo-pan.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/5H4yInM5zmHqpKIoMNAx4r',
    instagramUrl: 'https://instagram.com/polopanmusic',
  },
  {
    name: 'Juliette Armanet',
    genre: 'Pop / Variete Francaise',
    bio: 'Chanteuse et pianiste francaise. Son album "Petite Amie" a remporte le prix de lalbum revelation aux Victoires de la Musique.',
    imageUrl: 'https://example.com/artists/juliette-armanet.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/6YgHzKcEf8N3s0RSkFB5HV',
    instagramUrl: 'https://instagram.com/juliettearmanet',
  },
  {
    name: 'SCH',
    genre: 'Rap / Trap',
    bio: 'Rappeur marseillais. Leader de la scene trap francaise avec des albums comme "JVLIVS" et "Autobahn".',
    imageUrl: 'https://example.com/artists/sch.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/3R7LtBb8Iu9dEbT54LhEYB',
    instagramUrl: 'https://instagram.com/sch',
  },
  {
    name: 'Flavien Berger',
    genre: 'Pop Experimentale',
    bio: 'Compositeur et producteur francais. Ses albums "Leviathan" et "Contre-temps" explorent des territoires musicaux uniques.',
    imageUrl: 'https://example.com/artists/flavien-berger.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/6YmT8EIcnYS84FnqAbF3oX',
    instagramUrl: 'https://instagram.com/flavienberger',
  },
  {
    name: 'Josman',
    genre: 'Rap / Neo Soul',
    bio: 'Rappeur francais au style unique melangeant rap et RnB. Son album "J." a ete salue par la critique.',
    imageUrl: 'https://example.com/artists/josman.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/5MwaiKmFwPw5c1DxBR7bCY',
    instagramUrl: 'https://instagram.com/josman_94',
  },
  {
    name: 'Rone',
    genre: 'Electro / Techno Melodique',
    bio: 'Producteur electro francais. Ses compositions a la frontiere de la techno et de la musique classique sont uniques.',
    imageUrl: 'https://example.com/artists/rone.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/7qkzHlBVgPP6bT6cAl6x45',
    instagramUrl: 'https://instagram.com/roneofficial',
  },
  {
    name: 'Lomepal',
    genre: 'Rap / Pop Rap',
    bio: 'Rappeur et skateur francais. Ses albums "FLIP" et "Jeannine" ont conquis un large public avec leur sensibilite.',
    imageUrl: 'https://example.com/artists/lomepal.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/6aZyMrc4doVtZyKNilOmwu',
    instagramUrl: 'https://instagram.com/lomepal',
  },
  {
    name: 'Sofiane Pamart',
    genre: 'Neo-Classique / Hip-Hop',
    bio: 'Pianiste virtuose francais. Ses albums instrumentaux fusionnent musique classique et hip-hop avec brio.',
    imageUrl: 'https://example.com/artists/sofiane-pamart.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/3RNYqz5vBzJxnmGsPmYqSf',
    instagramUrl: 'https://instagram.com/sofianepamart',
  },
  {
    name: 'Suzane',
    genre: 'Pop Electro / Chanson',
    bio: 'Chanteuse francaise energique. Ses lives explosifs et ses textes engages en font une artiste incontournable.',
    imageUrl: 'https://example.com/artists/suzane.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/4EHgT8jqKzLLfuP3O02bKm',
    instagramUrl: 'https://instagram.com/suzanemusique',
  },
  {
    name: 'Vald',
    genre: 'Rap / Rap Alternatif',
    bio: 'Rappeur francais au style atypique et humoristique. Ses albums decalés comme "NQNT" ont crée un univers unique.',
    imageUrl: 'https://example.com/artists/vald.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/2kAkVaTeHr3b4DFTPX4FAM',
    instagramUrl: 'https://instagram.com/vfrfrr',
  },
  {
    name: 'The Blaze',
    genre: 'Electro / House',
    bio: 'Duo electro francais connu pour ses clips cinematographiques. "Virile" et "Territory" sont devenus des hymnes.',
    imageUrl: 'https://example.com/artists/the-blaze.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/7Fw1xGBqvk6LFmLlNZpV7f',
    instagramUrl: 'https://instagram.com/theblaze',
  },
  {
    name: 'La Femme',
    genre: 'Psyche Pop / Rock',
    bio: 'Groupe de psyche pop francais. Leur son unique melange surf rock, electro et chanson francaise.',
    imageUrl: 'https://example.com/artists/la-femme.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/5QcJfJnFnwOt3f3z7zGcCd',
    instagramUrl: 'https://instagram.com/lafemmemusic',
  },
  {
    name: 'Booba',
    genre: 'Rap / Trap',
    bio: 'Legende du rap francais. Depuis "Temps mort" jusqua "Ultra", il a influence des generations de rappeurs.',
    imageUrl: 'https://example.com/artists/booba.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/0j1U1vB1Sik6bqAJxO2Cr8',
    instagramUrl: 'https://instagram.com/booba',
  },
  {
    name: 'Vladimir Cauchemar',
    genre: 'Electro / Bass',
    bio: 'Producteur masque francais. Ses productions bass music et ses collaborations ont secoue la scene electro.',
    imageUrl: 'https://example.com/artists/vladimir-cauchemar.jpg',
    spotifyUrl: 'https://open.spotify.com/artist/4V8LLVI7PbaPR0K2TGSxFF',
    instagramUrl: 'https://instagram.com/vladimircauchemar',
  },
  // ==========================================
  // FAMOUS INTERNATIONAL ARTISTS
  // ==========================================
  {
    name: 'David Guetta',
    genre: 'EDM / House',
    bio: 'Legendary French DJ and producer. One of the most influential figures in electronic dance music with hits like "Titanium", "When Love Takes Over" and "Memories". Multiple Grammy Award winner.',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/1Cs0zKBU1kc0i8ypK3B9ai',
    instagramUrl: 'https://instagram.com/davidguetta',
  },
  {
    name: 'Martin Garrix',
    genre: 'Progressive House / EDM',
    bio: 'Dutch DJ and producer who rose to fame with "Animals" at just 17 years old. Named worlds number 1 DJ multiple times. Known for melodic progressive house productions.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/60d24wfXkVzDSfLS6hyCjZ',
    instagramUrl: 'https://instagram.com/martingarrix',
  },
  {
    name: 'Charlotte de Witte',
    genre: 'Techno',
    bio: 'Belgian DJ and producer, queen of techno. Known for her dark, driving techno sets. Founder of KNTXT label. First woman to close Tomorrowland mainstage.',
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/1VwDG9aBflQupaFNjUru9A',
    instagramUrl: 'https://instagram.com/charlottedewittemusic',
  },
  {
    name: 'Amelie Lens',
    genre: 'Techno',
    bio: 'Belgian techno DJ and producer. Rising star of the techno scene known for her energetic sets and productions. Founder of Lenske Records.',
    imageUrl: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/7aBzpmFXB4WWpPl9kE40ae',
    instagramUrl: 'https://instagram.com/amelikitten',
  },
  {
    name: 'Nina Kraviz',
    genre: 'Techno',
    bio: 'Russian DJ, producer and singer. One of the most influential figures in underground techno. Known for her hypnotic sets and Trip Records label.',
    imageUrl: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/0FTyipRkSh8HBiJPYYViMJ',
    instagramUrl: 'https://instagram.com/ninakraviz',
  },
  {
    name: 'Carl Cox',
    genre: 'House / Techno',
    bio: 'British DJ, king of techno. Legendary figure in electronic music with over 30 years of career. Known for his Space Ibiza residency and epic festival sets.',
    imageUrl: 'https://images.unsplash.com/photo-1571935441008-3caa3d87d6f0?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/2RuGjBaSPnPXYqNwPa8sVA',
    instagramUrl: 'https://instagram.com/carlcoxofficial',
  },
  {
    name: 'Stromae',
    genre: 'Pop / Electronic',
    bio: 'Belgian singer, songwriter and producer. Master of electronic pop with profound lyrics. Known for "Alors on danse", "Papaoutai" and "Sante". A true artist and visual genius.',
    imageUrl: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/3Y7RZ31TRPVadSFVy1o8mK',
    instagramUrl: 'https://instagram.com/stromae',
  },
  {
    name: 'Daft Punk',
    genre: 'Electronic / French Touch',
    bio: 'Legendary French electronic music duo. Pioneers of French Touch and electronic music. Known for "Around the World", "One More Time", "Get Lucky". Disbanded in 2021 but their legacy lives on.',
    imageUrl: 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi',
    instagramUrl: 'https://instagram.com/daftpunk',
  },
  {
    name: 'Justice',
    genre: 'Electronic / French Touch',
    bio: 'French electronic music duo. Grammy Award winners known for "D.A.N.C.E.", "Genesis" and their cross-shaped stacks of Marshall amplifiers. Masters of French electro.',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/1gR0gsQYfi6joyO1dlp76N',
    instagramUrl: 'https://instagram.com/etjusticepourtous',
  },
  {
    name: 'The Weeknd',
    genre: 'Pop / R&B',
    bio: 'Canadian singer, songwriter and record producer. One of the biggest pop stars in the world. Known for "Blinding Lights", "Starboy", "Save Your Tears". Grammy Award winner.',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ',
    instagramUrl: 'https://instagram.com/theweeknd',
  },
  {
    name: 'Dua Lipa',
    genre: 'Pop / Dance',
    bio: 'British singer and songwriter. Global pop superstar known for "New Rules", "Levitating", "Dont Start Now". Grammy Award winner. Queen of disco-pop revival.',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/6M2wZ9GZgrQXHCFfjv46we',
    instagramUrl: 'https://instagram.com/dualipa',
  },
  {
    name: 'Calvin Harris',
    genre: 'EDM / House',
    bio: 'Scottish DJ, record producer and songwriter. One of the highest-paid DJs in the world. Known for "Summer", "Feel So Close", "This Is What You Came For". Grammy Award winner.',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/7CajNmpbOovFoOoasH2HaY',
    instagramUrl: 'https://instagram.com/calvinharris',
  },
  {
    name: 'Tiesto',
    genre: 'Trance / EDM',
    bio: 'Dutch DJ and producer. Pioneer of trance music and EDM. Grammy Award winner. Known for "Adagio for Strings", "Red Lights", "The Business". Godfather of EDM.',
    imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/2o5jDhtHVPhrJdv3cEQ99Z',
    instagramUrl: 'https://instagram.com/tiesto',
  },
  {
    name: 'Armin van Buuren',
    genre: 'Trance / Progressive',
    bio: 'Dutch DJ and producer. King of trance music. Host of A State of Trance radio show. 5-time worlds number 1 DJ. Known for "This Is What It Feels Like", "Blah Blah Blah".',
    imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/0SfsnGyD8FpIN4U4WCkBZ5',
    instagramUrl: 'https://instagram.com/arminvanbuuren',
  },
  {
    name: 'Deadmau5',
    genre: 'Progressive House / Electro',
    bio: 'Canadian DJ and producer. Known for his iconic mouse helmet. Pioneer of progressive house. Grammy nominated. Known for "Strobe", "Ghosts n Stuff", "I Remember".',
    imageUrl: 'https://images.unsplash.com/photo-1571935441008-3caa3d87d6f0?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/2CIMQHirSU0MQqyYHq0eOx',
    instagramUrl: 'https://instagram.com/deadmau5',
  },
  {
    name: 'Skrillex',
    genre: 'Dubstep / EDM',
    bio: 'American DJ and producer. Pioneer of dubstep and bass music. 8-time Grammy Award winner. Known for "Bangarang", "Scary Monsters and Nice Sprites", "Where Are U Now".',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
    spotifyUrl: 'https://open.spotify.com/artist/5he5w2lnU9x7JFhnwcekXX',
    instagramUrl: 'https://instagram.com/skrillex',
  },
];

// ============================================================================
// VENDORS
// ============================================================================

const VENDOR_DATA = [
  {
    name: 'Le Gourmet Burger',
    type: VendorType.FOOD,
    description: 'Burgers artisanaux avec viande francaise et ingredients locaux',
    products: [
      'Burger Classic',
      'Burger Cheesy',
      'Burger Veggie',
      'Frites Maison',
      'Coleslaw',
      'Onion Rings',
    ],
  },
  {
    name: 'Pizza Napoli',
    type: VendorType.FOOD,
    description: 'Pizzas cuites au feu de bois selon la tradition napolitaine',
    products: ['Margherita', 'Regina', 'Quattro Formaggi', 'Calzone', 'Bruschetta', 'Tiramisu'],
  },
  {
    name: 'Sushi Time',
    type: VendorType.FOOD,
    description: 'Sushis et specialites japonaises fraiches',
    products: ['Sashimi Mix', 'Maki California', 'Tempura Gambas', 'Ramen', 'Edamame', 'Gyozas'],
  },
  {
    name: 'Tacos El Fuego',
    type: VendorType.FOOD,
    description: 'Cuisine mexicaine authentique et epices',
    products: [
      'Tacos Carnitas',
      'Burrito Poulet',
      'Quesadilla',
      'Nachos Supreme',
      'Guacamole',
      'Churros',
    ],
  },
  {
    name: 'Crepes Bretonnes',
    type: VendorType.FOOD,
    description: 'Crepes et galettes traditionnelles de Bretagne',
    products: [
      'Galette Complete',
      'Galette Saumon',
      'Crepe Nutella',
      'Crepe Caramel',
      'Cidre Breton',
      'Kouign-amann',
    ],
  },
  {
    name: 'Le Bar a Cocktails',
    type: VendorType.BAR,
    description: 'Cocktails signatures et classiques revisites',
    products: ['Mojito', 'Margarita', 'Pina Colada', 'Spritz', 'Moscow Mule', 'Daiquiri'],
  },
  {
    name: 'Bieres Artisanales',
    type: VendorType.BAR,
    description: 'Selection de bieres craft francaises et internationales',
    products: [
      'IPA Locale',
      'Blonde Legere',
      'Stout Chocolat',
      'Blanche Agrumes',
      'Ambre Caramel',
      'Cidre Bio',
    ],
  },
  {
    name: 'Wine & Co',
    type: VendorType.BAR,
    description: 'Vins francais et planches apero',
    products: [
      'Vin Rouge Bordeaux',
      'Vin Blanc Bourgogne',
      'Rose Provence',
      'Champagne Brut',
      'Planche Fromages',
      'Planche Charcuterie',
    ],
  },
  {
    name: 'Fresh Bar',
    type: VendorType.DRINK,
    description: 'Jus de fruits frais et smoothies vitamines',
    products: [
      'Smoothie Fruits Rouges',
      'Jus Orange Presse',
      'Smoothie Tropical',
      'Limonade Maison',
      'The Glace',
      'Agua Fresca',
    ],
  },
  {
    name: 'Coffee Corner',
    type: VendorType.DRINK,
    description: 'Cafe de specialite et patisseries',
    products: ['Espresso', 'Cappuccino', 'Latte', 'Cold Brew', 'Croissant', 'Pain au Chocolat'],
  },
  {
    name: 'Festival Merch',
    type: VendorType.MERCHANDISE,
    description: 'Boutique officielle du festival',
    products: [
      'T-shirt Festival',
      'Sweat Logo',
      'Casquette',
      'Sac Tote',
      'Poster Signe',
      'Bracelet Collector',
    ],
  },
  {
    name: 'Vinyl Paradise',
    type: VendorType.MERCHANDISE,
    description: 'Disques vinyles et CDs des artistes',
    products: [
      'Vinyle Edition Limitee',
      'CD Album',
      'Vinyle Collector',
      'Poster Artiste',
      'Badge Set',
      'Stickers Pack',
    ],
  },
  {
    name: 'Glaces Artisanales',
    type: VendorType.FOOD,
    description: 'Glaces italiennes faites maison',
    products: [
      'Glace Vanille',
      'Glace Chocolat',
      'Sorbet Citron',
      'Glace Pistache',
      'Sundae Caramel',
      'Crepe Glacee',
    ],
  },
  {
    name: 'Asian Street Food',
    type: VendorType.FOOD,
    description: 'Street food asiatique : Bobuns, Banh Mi, Pad Thai',
    products: [
      'Bobun Boeuf',
      'Banh Mi Poulet',
      'Pad Thai Crevettes',
      'Nems Vegetariens',
      'Soupe Pho',
      'Bubble Tea',
    ],
  },
  {
    name: 'Le Petit Bistrot',
    type: VendorType.FOOD,
    description: 'Cuisine francaise traditionnelle revisitee',
    products: [
      'Croque Monsieur',
      'Salade Nicoise',
      'Quiche Lorraine',
      'Boeuf Bourguignon',
      'Tarte Tatin',
      'Cafe Gourmand',
    ],
  },
  // Template vendors with standardized products
  {
    name: 'Bar Festival Standard',
    type: VendorType.BAR,
    description: 'Bar officiel du festival avec boissons standards',
    useStandardProducts: true,
    productType: 'drinks' as const,
  },
  {
    name: 'Food Court Standard',
    type: VendorType.FOOD,
    description: 'Point restauration avec menu standard festival',
    useStandardProducts: true,
    productType: 'food' as const,
  },
];

// Type for vendor data with optional standard products flag
interface _VendorDataItem {
  name: string;
  type: VendorType;
  description: string;
  products?: string[];
  useStandardProducts?: boolean;
  productType?: 'drinks' | 'food';
}

// ============================================================================
// STANDARD PRODUCT TEMPLATES (Drinks & Food)
// ============================================================================

/**
 * Standard drink products that vendors can use as templates.
 * Prices are in EUR and represent typical festival pricing.
 */
const STANDARD_DRINKS = {
  // Beers
  beers: [
    { name: 'Heineken', price: 6.0, category: 'Bieres' },
    { name: 'Corona', price: 7.0, category: 'Bieres' },
    { name: 'Leffe Blonde', price: 7.5, category: 'Bieres' },
    { name: '1664', price: 6.0, category: 'Bieres' },
    { name: 'Desperados', price: 7.0, category: 'Bieres' },
    { name: 'Grimbergen', price: 7.5, category: 'Bieres' },
  ],
  // Soft Drinks
  softDrinks: [
    { name: 'Coca-Cola', price: 4.0, category: 'Softs' },
    { name: 'Coca-Cola Zero', price: 4.0, category: 'Softs' },
    { name: 'Sprite', price: 4.0, category: 'Softs' },
    { name: 'Fanta', price: 4.0, category: 'Softs' },
    { name: 'Red Bull', price: 6.0, category: 'Energy' },
    { name: 'Monster', price: 6.0, category: 'Energy' },
    { name: 'Eau minerale 50cl', price: 3.0, category: 'Eau' },
    { name: 'Eau minerale 1L', price: 5.0, category: 'Eau' },
    { name: "Jus d'orange", price: 4.5, category: 'Jus' },
    { name: 'Ice Tea', price: 4.5, category: 'Softs' },
  ],
  // Spirits (shots)
  spirits: [
    { name: 'Vodka (shot)', price: 8.0, category: 'Spiritueux' },
    { name: 'Rhum (shot)', price: 8.0, category: 'Spiritueux' },
    { name: 'Whisky (shot)', price: 9.0, category: 'Spiritueux' },
    { name: 'Gin (shot)', price: 8.0, category: 'Spiritueux' },
    { name: 'Tequila (shot)', price: 8.0, category: 'Spiritueux' },
  ],
  // Cocktails
  cocktails: [
    { name: 'Mojito', price: 12.0, category: 'Cocktails' },
    { name: 'Spritz', price: 10.0, category: 'Cocktails' },
    { name: 'Margarita', price: 12.0, category: 'Cocktails' },
    { name: 'Sex on the Beach', price: 11.0, category: 'Cocktails' },
    { name: 'Pina Colada', price: 12.0, category: 'Cocktails' },
    { name: 'Cuba Libre', price: 10.0, category: 'Cocktails' },
  ],
  // Wine
  wine: [
    { name: 'Vin Rouge (verre)', price: 7.0, category: 'Vins' },
    { name: 'Vin Blanc (verre)', price: 7.0, category: 'Vins' },
    { name: 'Vin Rose (verre)', price: 7.0, category: 'Vins' },
    { name: 'Champagne (coupe)', price: 15.0, category: 'Champagne' },
  ],
};

/**
 * Standard food items that vendors can use as templates.
 * Prices are in EUR and represent typical festival pricing.
 */
const STANDARD_FOOD_ITEMS = [
  { name: 'Burger Classic', price: 12.0, category: 'Burgers' },
  { name: 'Burger Cheese', price: 13.0, category: 'Burgers' },
  { name: 'Hot-dog', price: 8.0, category: 'Fast-Food' },
  { name: 'Pizza Margherita', price: 10.0, category: 'Pizza' },
  { name: 'Pizza 4 Fromages', price: 12.0, category: 'Pizza' },
  { name: 'Frites', price: 5.0, category: 'Accompagnements' },
  { name: 'Frites Sauce', price: 6.0, category: 'Accompagnements' },
  { name: 'Wrap Poulet', price: 9.0, category: 'Wraps' },
  { name: 'Wrap Veggie', price: 9.0, category: 'Wraps' },
  { name: 'Salade Caesar', price: 10.0, category: 'Salades' },
  { name: 'Tacos', price: 10.0, category: 'Mexicain' },
  { name: 'Kebab', price: 10.0, category: 'Kebab' },
  { name: 'Panini', price: 8.0, category: 'Snacks' },
  { name: 'Croque-monsieur', price: 7.0, category: 'Snacks' },
  { name: 'Nachos', price: 8.0, category: 'Mexicain' },
  { name: 'Churros', price: 6.0, category: 'Desserts' },
  { name: 'Crepe Sucre', price: 5.0, category: 'Crepes' },
  { name: 'Crepe Nutella', price: 7.0, category: 'Crepes' },
  { name: 'Glace (boule)', price: 3.0, category: 'Desserts' },
];

/**
 * Standard ticket type descriptions that organizers can use as templates.
 * These provide professional descriptions for common ticket categories.
 *
 * Usage: This template is exported for use by the admin UI and API endpoints
 * when creating new ticket categories. Organizers can clone these descriptions.
 *
 * @example
 * const description = TICKET_TYPE_DESCRIPTIONS[TicketType.VIP].description;
 * // => 'Acces prioritaire, zone VIP avec vue privilegiee, bar VIP'
 */
export const TICKET_TYPE_DESCRIPTIONS: Record<TicketType, { name: string; description: string }> = {
  [TicketType.STANDARD]: {
    name: 'Standard',
    description: 'Acces general aux scenes principales',
  },
  [TicketType.VIP]: {
    name: 'VIP',
    description: 'Acces prioritaire, zone VIP avec vue privilegiee, bar VIP',
  },
  [TicketType.BACKSTAGE]: {
    name: 'Backstage',
    description: 'Tous les avantages VIP + acces aux coulisses + rencontre artistes',
  },
  [TicketType.CAMPING]: {
    name: 'Camping',
    description: 'Emplacement camping reserve avec acces sanitaires',
  },
  [TicketType.PARKING]: {
    name: 'Parking',
    description: 'Place de parking securise 24h/24',
  },
  [TicketType.COMBO]: {
    name: 'Combo',
    description: 'Pack festival + camping a tarif reduit',
  },
};

// Also export standard products for use by other modules
export { STANDARD_DRINKS, STANDARD_FOOD_ITEMS };

// ============================================================================
// FAQ DATA
// ============================================================================

const FAQ_CATEGORIES = [
  { name: 'Billetterie', order: 1 },
  { name: 'Acces & Transport', order: 2 },
  { name: 'Sur le site', order: 3 },
  { name: 'Camping', order: 4 },
  { name: 'Cashless', order: 5 },
];

const FAQ_ITEMS = [
  {
    category: 'Billetterie',
    question: 'Comment puis-je acheter mes billets ?',
    answer:
      'Vous pouvez acheter vos billets directement sur notre site web ou via notre application mobile. Le paiement est securise par Stripe et vous recevrez votre billet electronique par email.',
    order: 1,
  },
  {
    category: 'Billetterie',
    question: 'Puis-je me faire rembourser mon billet ?',
    answer:
      'Les billets sont remboursables jusqua 30 jours avant le debut du festival. Passe ce delai, aucun remboursement nest possible sauf en cas dannulation de levenement.',
    order: 2,
  },
  {
    category: 'Billetterie',
    question: 'Comment fonctionne le transfert de billet ?',
    answer:
      'Vous pouvez transferer votre billet a une autre personne via lapplication. Le nouveau proprietaire recevra un QR code a son nom.',
    order: 3,
  },
  {
    category: 'Billetterie',
    question: 'Mon QR code ne fonctionne pas, que faire ?',
    answer:
      'Rendez-vous a laccueil avec une piece didentite et votre confirmation dachat. Nous genererons un nouveau QR code sur place.',
    order: 4,
  },
  {
    category: 'Acces & Transport',
    question: 'Comment venir au festival ?',
    answer:
      'Le site est accessible en voiture (parking payant), en train (navettes depuis la gare) et en bus. Des covoiturages sont egalement organises via notre partenaire.',
    order: 1,
  },
  {
    category: 'Acces & Transport',
    question: 'Y a-t-il un parking sur place ?',
    answer:
      'Oui, un parking de 3000 places est disponible. Le pass parking est en vente sur notre billetterie. Le parking est surveille 24h/24.',
    order: 2,
  },
  {
    category: 'Acces & Transport',
    question: 'Des navettes sont-elles prevues ?',
    answer:
      'Des navettes gratuites circulent entre la gare et le festival toutes les 15 minutes de 10h a 4h du matin.',
    order: 3,
  },
  {
    category: 'Sur le site',
    question: 'Puis-je sortir et rentrer du festival ?',
    answer:
      'Oui, votre bracelet vous permet dentrer et sortir librement du site pendant toute la duree de votre pass.',
    order: 1,
  },
  {
    category: 'Sur le site',
    question: 'Y a-t-il des consignes pour mes affaires ?',
    answer:
      'Des consignes securisees sont disponibles a lentree (5EUR/jour). Des points de charge pour telephones sont egalement mis a disposition.',
    order: 2,
  },
  {
    category: 'Sur le site',
    question: 'Les animaux sont-ils acceptes ?',
    answer:
      'Non, les animaux ne sont pas autorises sur le site du festival, a lexception des chiens dassistance.',
    order: 3,
  },
  {
    category: 'Sur le site',
    question: 'Que faire si je me blesse ?',
    answer:
      'Des postes de secours sont repartis sur tout le site. En cas durgence, adressez-vous au personnel en gilet jaune ou appelez le numero durgence affiche partout.',
    order: 4,
  },
  {
    category: 'Camping',
    question: 'Que puis-je apporter au camping ?',
    answer:
      'Tente, sac de couchage, lampe de poche. Sont interdits : generateurs, barbecues, structures rigides, animaux.',
    order: 1,
  },
  {
    category: 'Camping',
    question: 'Y a-t-il des douches et toilettes ?',
    answer:
      'Oui, sanitaires et douches sont disponibles. Les campeurs Premium ont acces a des installations privatives.',
    order: 2,
  },
  {
    category: 'Camping',
    question: 'Le camping est-il securise ?',
    answer:
      'Le camping est cloture et surveille 24h/24 par notre equipe de securite. Des vigiles patrouillent regulierement.',
    order: 3,
  },
  {
    category: 'Cashless',
    question: 'Comment fonctionne le cashless ?',
    answer:
      'Toutes les transactions sur le site se font via le systeme cashless. Rechargez votre compte via lapplication ou aux bornes sur place.',
    order: 1,
  },
  {
    category: 'Cashless',
    question: 'Comment recharger mon compte ?',
    answer:
      'Par carte bancaire sur lapplication, aux bornes automatiques ou en especes aux points de recharge du festival.',
    order: 2,
  },
  {
    category: 'Cashless',
    question: 'Comment recuperer mon solde non utilise ?',
    answer:
      'Apres le festival, demandez un remboursement via lapplication. Le virement sera effectue sous 15 jours ouvrés.',
    order: 3,
  },
  {
    category: 'Cashless',
    question: 'Jai perdu mon bracelet cashless, que faire ?',
    answer:
      'Rendez-vous a laccueil cashless avec votre piece didentite. Nous transfererons votre solde sur un nouveau bracelet.',
    order: 4,
  },
];

// ============================================================================
// POI (Points of Interest) DATA
// ============================================================================

const POI_TYPES_DATA = [
  { type: PoiType.STAGE, name: 'Scene Principale', icon: 'stage-main' },
  { type: PoiType.STAGE, name: 'Scene Electro', icon: 'stage-electro' },
  { type: PoiType.STAGE, name: 'Scene Acoustique', icon: 'stage-acoustic' },
  { type: PoiType.FOOD, name: 'Food Court Nord', icon: 'food' },
  { type: PoiType.FOOD, name: 'Food Court Sud', icon: 'food' },
  { type: PoiType.DRINK, name: 'Bar Central', icon: 'drink' },
  { type: PoiType.DRINK, name: 'Bar VIP', icon: 'drink-vip' },
  { type: PoiType.TOILET, name: 'Toilettes A', icon: 'toilet' },
  { type: PoiType.TOILET, name: 'Toilettes B', icon: 'toilet' },
  { type: PoiType.TOILET, name: 'Toilettes VIP', icon: 'toilet-vip' },
  { type: PoiType.MEDICAL, name: 'Poste Medical Principal', icon: 'medical' },
  { type: PoiType.MEDICAL, name: 'Poste Medical Camping', icon: 'medical' },
  { type: PoiType.INFO, name: 'Accueil Festival', icon: 'info' },
  { type: PoiType.INFO, name: 'Point Info VIP', icon: 'info-vip' },
  { type: PoiType.ATM, name: 'Distributeur 1', icon: 'atm' },
  { type: PoiType.ATM, name: 'Distributeur 2', icon: 'atm' },
  { type: PoiType.PARKING, name: 'Parking Principal', icon: 'parking' },
  { type: PoiType.PARKING, name: 'Parking VIP', icon: 'parking-vip' },
  { type: PoiType.CAMPING, name: 'Camping Standard', icon: 'camping' },
  { type: PoiType.CAMPING, name: 'Camping Premium', icon: 'camping-premium' },
  { type: PoiType.ENTRANCE, name: 'Entree Principale', icon: 'entrance' },
  { type: PoiType.ENTRANCE, name: 'Entree VIP', icon: 'entrance-vip' },
  { type: PoiType.EXIT, name: 'Sortie Principale', icon: 'exit' },
  { type: PoiType.CHARGING, name: 'Station Recharge 1', icon: 'charging' },
  { type: PoiType.CHARGING, name: 'Station Recharge 2', icon: 'charging' },
  { type: PoiType.LOCKER, name: 'Consignes A', icon: 'locker' },
  { type: PoiType.LOCKER, name: 'Consignes B', icon: 'locker' },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

interface SeedContext {
  users: { id: string; role: UserRole; email: string }[];
  festivals: { id: string; name: string; startDate: Date; status: FestivalStatus }[];
  ticketCategories: {
    id: string;
    festivalId: string;
    price: number;
    type: TicketType;
    name: string;
  }[];
  zones: { id: string; festivalId: string; name: string }[];
  artists: { id: string; name: string }[];
  stages: { id: string; festivalId: string; name: string }[];
  vendors: { id: string; festivalId: string; name: string }[];
  products: { id: string; vendorId: string; name: string; price: number }[];
  cashlessAccounts: { id: string; userId: string }[];
  tickets: { id: string; festivalId: string; userId: string }[];
  payments: { id: string; userId: string }[];
  faqCategories: { id: string; name: string }[];
}

async function cleanDatabase(): Promise<void> {
  logSection('CLEANING DATABASE');

  // Delete in order of dependencies (most dependent first)
  const deleteOperations = [
    prisma.zoneAccessLog.deleteMany(),
    prisma.vendorOrderItem.deleteMany(),
    prisma.vendorOrder.deleteMany(),
    prisma.vendorPayout.deleteMany(),
    prisma.vendorProduct.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.cashlessTransaction.deleteMany(),
    prisma.cashlessAccount.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.ticketCategory.deleteMany(),
    prisma.performance.deleteMany(),
    prisma.stage.deleteMany(),
    prisma.artist.deleteMany(),
    prisma.staffAssignment.deleteMany(),
    prisma.zone.deleteMany(),
    prisma.campingBooking.deleteMany(),
    prisma.campingSpot.deleteMany(),
    prisma.mapPoi.deleteMany(),
    prisma.supportMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.faqItem.deleteMany(),
    prisma.faqCategory.deleteMany(),
    prisma.lostItem.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.pushToken.deleteMany(),
    prisma.festival.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ];

  for (const operation of deleteOperations) {
    await operation;
  }

  log('Database cleaned successfully');
}

async function seedUsers(ctx: SeedContext): Promise<void> {
  logStep(1, 12, 'Creating users...');

  const passwordHash = await hashPassword(CONFIG.SEED_PASSWORD);

  // Demo users with predictable credentials
  const demoUsers = [
    { email: 'admin@festival.fr', firstName: 'Admin', lastName: 'Festival', role: UserRole.ADMIN },
    {
      email: 'organisateur@festival.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: UserRole.ORGANIZER,
    },
    { email: 'staff@festival.fr', firstName: 'Marie', lastName: 'Martin', role: UserRole.STAFF },
    {
      email: 'caissier@festival.fr',
      firstName: 'Paul',
      lastName: 'Bernard',
      role: UserRole.CASHIER,
    },
    {
      email: 'securite@festival.fr',
      firstName: 'Thomas',
      lastName: 'Leroy',
      role: UserRole.SECURITY,
    },
    { email: 'user@festival.fr', firstName: 'Pierre', lastName: 'Moreau', role: UserRole.USER },
  ];

  // Create demo users
  for (const demoUser of demoUsers) {
    const user = await prisma.user.create({
      data: {
        email: demoUser.email,
        passwordHash,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        phone: randomPhoneNumber(),
        role: demoUser.role,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
    ctx.users.push({ id: user.id, role: user.role, email: user.email });
    log(`Demo user: ${user.email} (${user.role})`, 1);
  }

  // Create additional users per role
  const roleCounts: Record<UserRole, number> = {
    [UserRole.ADMIN]: 2,
    [UserRole.ORGANIZER]: 3,
    [UserRole.STAFF]: 12,
    [UserRole.CASHIER]: 6,
    [UserRole.SECURITY]: 8,
    [UserRole.USER]: 20,
  };

  for (const [role, count] of Object.entries(roleCounts)) {
    for (let i = 0; i < count; i++) {
      const firstName = randomElement(FRENCH_FIRST_NAMES);
      const lastName = randomElement(FRENCH_LAST_NAMES);
      const uniqueId = randomInt(1000, 9999);

      const user = await prisma.user.create({
        data: {
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueId}@email.fr`,
          passwordHash,
          firstName,
          lastName,
          phone: randomPhoneNumber(),
          role: role as UserRole,
          status: randomElement([
            UserStatus.ACTIVE,
            UserStatus.ACTIVE,
            UserStatus.ACTIVE,
            UserStatus.PENDING_VERIFICATION,
          ]),
          emailVerified: Math.random() > 0.2,
        },
      });
      ctx.users.push({ id: user.id, role: user.role, email: user.email });
    }
    log(`Created ${count} additional ${role} users`, 1);
  }

  log(`Total users created: ${ctx.users.length}`, 1);
}

async function seedFestivals(ctx: SeedContext): Promise<void> {
  logStep(2, 12, 'Creating festivals...');

  const organizers = ctx.users.filter((u) => u.role === UserRole.ORGANIZER);

  for (let i = 0; i < FESTIVAL_DATA.length; i++) {
    const festivalDef = FESTIVAL_DATA[i];
    const organizer = organizers[i % organizers.length];

    const now = new Date();
    const startDate = new Date(now.getTime() + festivalDef.daysOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + festivalDef.duration * 24 * 60 * 60 * 1000);

    // Use imageIndex from festival data if available, otherwise use loop index
    const imageIndex = (festivalDef as any).imageIndex ?? i;

    const festival = await prisma.festival.create({
      data: {
        organizerId: organizer.id,
        name: festivalDef.name,
        slug: festivalDef.slug,
        description: festivalDef.description,
        location: festivalDef.location,
        address: festivalDef.address,
        startDate,
        endDate,
        status: festivalDef.status,
        maxCapacity: festivalDef.maxCapacity,
        currentAttendees:
          festivalDef.status === FestivalStatus.ONGOING ? randomInt(10000, 25000) : 0,
        logoUrl: getFestivalImageUrl(imageIndex),
        bannerUrl: getFestivalImageUrl(imageIndex),
        websiteUrl: `https://${festivalDef.slug}.fr`,
        contactEmail: `contact@${festivalDef.slug}.fr`,
        timezone: 'Europe/Paris',
        currency: 'EUR',
        genres: (festivalDef as any).genres || [],
        isFeatured: (festivalDef as any).isFeatured || false,
      },
    });

    ctx.festivals.push({
      id: festival.id,
      name: festival.name,
      startDate: festival.startDate,
      status: festival.status,
    });

    log(`Festival: ${festival.name} (${festival.status})`, 1);
  }
}

async function seedTicketCategories(ctx: SeedContext): Promise<void> {
  logStep(3, 12, 'Creating ticket categories...');

  for (const festival of ctx.festivals) {
    const saleStartDate = new Date(festival.startDate.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days before
    const saleEndDate = new Date(festival.startDate.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before

    for (const categoryDef of TICKET_CATEGORIES) {
      const soldCount =
        festival.status === FestivalStatus.COMPLETED
          ? Math.floor(categoryDef.quota * randomFloat(0.7, 0.95))
          : festival.status === FestivalStatus.ONGOING
            ? Math.floor(categoryDef.quota * randomFloat(0.5, 0.8))
            : Math.floor(categoryDef.quota * randomFloat(0.1, 0.4));

      const category = await prisma.ticketCategory.create({
        data: {
          festivalId: festival.id,
          name: categoryDef.name,
          description: categoryDef.description,
          type: categoryDef.type,
          price: categoryDef.price,
          quota: categoryDef.quota,
          soldCount,
          maxPerUser: categoryDef.maxPerUser,
          saleStartDate,
          saleEndDate,
          isActive: true,
        },
      });

      ctx.ticketCategories.push({
        id: category.id,
        festivalId: category.festivalId,
        price: parseFloat(category.price.toString()),
        type: category.type,
        name: category.name,
      });
    }

    log(`Created ${TICKET_CATEGORIES.length} categories for ${festival.name}`, 1);
  }
}

async function seedZones(ctx: SeedContext): Promise<void> {
  logStep(4, 12, 'Creating zones...');

  for (const festival of ctx.festivals) {
    for (const zoneDef of ZONE_TEMPLATES) {
      const zone = await prisma.zone.create({
        data: {
          festivalId: festival.id,
          name: zoneDef.name,
          description: zoneDef.description,
          capacity: zoneDef.capacity,
          currentOccupancy:
            festival.status === FestivalStatus.ONGOING
              ? randomInt(0, Math.floor(zoneDef.capacity * 0.6))
              : 0,
          requiresTicketType: zoneDef.types,
          isActive: true,
        },
      });

      ctx.zones.push({
        id: zone.id,
        festivalId: zone.festivalId,
        name: zone.name,
      });
    }

    log(`Created ${ZONE_TEMPLATES.length} zones for ${festival.name}`, 1);
  }
}

async function seedArtists(ctx: SeedContext): Promise<void> {
  logStep(5, 12, 'Creating artists...');

  for (const artistDef of ARTIST_DATA) {
    const artist = await prisma.artist.create({
      data: {
        name: artistDef.name,
        genre: artistDef.genre,
        bio: artistDef.bio,
        imageUrl: artistDef.imageUrl,
        spotifyUrl: artistDef.spotifyUrl,
        instagramUrl: artistDef.instagramUrl,
        websiteUrl: `https://${slugify(artistDef.name)}.com`,
      },
    });

    ctx.artists.push({ id: artist.id, name: artist.name });
  }

  log(`Created ${ctx.artists.length} artists`, 1);
}

async function seedStages(ctx: SeedContext): Promise<void> {
  logStep(6, 12, 'Creating stages...');

  const stageNames = [
    'Scene Principale',
    'Scene Electro',
    'Scene Acoustique',
    'Scene Discovery',
    'Scene DJ Set',
    'Scene VIP Lounge',
  ];

  for (const festival of ctx.festivals) {
    const city =
      FESTIVAL_DATA.find((f) => f.slug === festival.name.toLowerCase().replace(/\s+/g, '-'))
        ?.city || randomElement(FRENCH_CITIES);

    for (const stageName of stageNames) {
      const stage = await prisma.stage.create({
        data: {
          festivalId: festival.id,
          name: stageName,
          description: `${stageName} du ${festival.name}`,
          capacity: randomInt(2000, 35000),
          location: `Lat: ${city.lat + randomFloat(-0.01, 0.01)}, Lng: ${city.lng + randomFloat(-0.01, 0.01)}`,
        },
      });

      ctx.stages.push({
        id: stage.id,
        festivalId: stage.festivalId,
        name: stage.name,
      });
    }

    log(`Created ${stageNames.length} stages for ${festival.name}`, 1);
  }
}

async function seedPerformances(ctx: SeedContext): Promise<void> {
  logStep(7, 12, 'Creating performances...');

  let performanceCount = 0;

  for (const festival of ctx.festivals) {
    const festivalStages = ctx.stages.filter((s) => s.festivalId === festival.id);
    const shuffledArtists = [...ctx.artists].sort(() => 0.5 - Math.random());

    // Create schedule for each day
    const festivalDays = FESTIVAL_DATA.find((f) => f.name === festival.name)?.duration || 3;

    for (let day = 0; day < festivalDays; day++) {
      const dayStart = new Date(festival.startDate);
      dayStart.setDate(dayStart.getDate() + day);
      dayStart.setHours(14, 0, 0, 0); // Start at 14:00

      for (const stage of festivalStages) {
        // 4-6 performances per stage per day
        const performancesPerDay = randomInt(4, 6);
        let currentTime = new Date(dayStart);

        for (let p = 0; p < performancesPerDay && shuffledArtists.length > 0; p++) {
          const artist = shuffledArtists.pop();
          if (!artist) {
            break;
          }

          const duration = randomInt(45, 90); // 45 to 90 minutes
          const endTime = new Date(currentTime.getTime() + duration * 60 * 1000);

          await prisma.performance.create({
            data: {
              artistId: artist.id,
              stageId: stage.id,
              startTime: currentTime,
              endTime,
              description: `Performance live de ${artist.name}`,
              isCancelled: Math.random() < 0.02, // 2% cancelled
            },
          });

          performanceCount++;

          // Add break between performances
          currentTime = new Date(endTime.getTime() + randomInt(15, 30) * 60 * 1000);
        }
      }
    }
  }

  log(`Created ${performanceCount} performances`, 1);
}

/**
 * Helper to get all standard drink products flattened into a single array
 */
function getAllStandardDrinks(): { name: string; price: number; category: string }[] {
  return [
    ...STANDARD_DRINKS.beers,
    ...STANDARD_DRINKS.softDrinks,
    ...STANDARD_DRINKS.spirits,
    ...STANDARD_DRINKS.cocktails,
    ...STANDARD_DRINKS.wine,
  ];
}

async function seedVendors(ctx: SeedContext): Promise<void> {
  logStep(8, 12, 'Creating vendors and products...');

  const organizers = ctx.users.filter(
    (u) => u.role === UserRole.ORGANIZER || u.role === UserRole.ADMIN
  );

  for (const festival of ctx.festivals) {
    const city =
      FESTIVAL_DATA.find((f) => f.name === festival.name)?.city || randomElement(FRENCH_CITIES);

    for (const vendorDef of VENDOR_DATA) {
      const owner = randomElement(organizers);
      const typedVendorDef = vendorDef as VendorDataItem;

      const vendor = await prisma.vendor.create({
        data: {
          festivalId: festival.id,
          ownerId: owner.id,
          name: typedVendorDef.name,
          type: typedVendorDef.type,
          description: typedVendorDef.description,
          logoUrl: `https://example.com/vendors/${slugify(typedVendorDef.name)}/logo.png`,
          location: `Zone ${typedVendorDef.type}`,
          latitude: city.lat + randomFloat(-0.005, 0.005),
          longitude: city.lng + randomFloat(-0.005, 0.005),
          commissionRate: randomFloat(8, 15),
          isOpen: festival.status === FestivalStatus.ONGOING,
          isActive: true,
          openingHours: {
            friday: { open: '12:00', close: '02:00' },
            saturday: { open: '12:00', close: '02:00' },
            sunday: { open: '12:00', close: '23:00' },
          },
          qrMenuCode: `MENU-${generateUUID().slice(0, 8)}`,
        },
      });

      ctx.vendors.push({
        id: vendor.id,
        festivalId: vendor.festivalId,
        name: vendor.name,
      });

      // Determine which products to create
      let productsToCreate: { name: string; price: number; category: string }[] = [];

      if (typedVendorDef.useStandardProducts) {
        // Use standard product templates with fixed prices
        if (typedVendorDef.productType === 'drinks') {
          productsToCreate = getAllStandardDrinks();
        } else if (typedVendorDef.productType === 'food') {
          productsToCreate = STANDARD_FOOD_ITEMS;
        }
      } else if (typedVendorDef.products) {
        // Use custom products with random prices (legacy behavior)
        productsToCreate = typedVendorDef.products.map((productName) => {
          const price =
            typedVendorDef.type === VendorType.MERCHANDISE
              ? randomFloat(15, 45)
              : typedVendorDef.type === VendorType.BAR
                ? randomFloat(5, 15)
                : randomFloat(6, 18);
          return {
            name: productName,
            price,
            category:
              typedVendorDef.type === VendorType.FOOD
                ? 'Plat'
                : typedVendorDef.type === VendorType.BAR
                  ? 'Boisson'
                  : 'Article',
          };
        });
      }

      // Create products for this vendor
      for (let i = 0; i < productsToCreate.length; i++) {
        const productDef = productsToCreate[i];

        const product = await prisma.vendorProduct.create({
          data: {
            vendorId: vendor.id,
            name: productDef.name,
            description: typedVendorDef.useStandardProducts
              ? `${productDef.name} - Prix standard festival`
              : `Delicieux ${productDef.name.toLowerCase()} prepare avec soin`,
            price: productDef.price,
            category: productDef.category,
            imageUrl: `https://example.com/products/${slugify(productDef.name)}.jpg`,
            stock: typedVendorDef.type === VendorType.MERCHANDISE ? randomInt(50, 200) : null,
            soldCount: festival.status !== FestivalStatus.PUBLISHED ? randomInt(10, 100) : 0,
            isAvailable: true,
            sortOrder: i,
            allergens:
              typedVendorDef.type === VendorType.FOOD && !typedVendorDef.useStandardProducts
                ? randomElements(['gluten', 'lactose', 'arachides', 'soja'], randomInt(0, 2))
                : [],
          },
        });

        ctx.products.push({
          id: product.id,
          vendorId: product.vendorId,
          name: product.name,
          price: parseFloat(product.price.toString()),
        });
      }
    }

    log(`Created ${VENDOR_DATA.length} vendors with products for ${festival.name}`, 1);
  }
}

async function seedPaymentsAndTickets(ctx: SeedContext): Promise<void> {
  logStep(9, 12, 'Creating payments and tickets...');

  const regularUsers = ctx.users.filter((u) => u.role === UserRole.USER);
  let ticketCount = 0;
  let paymentCount = 0;

  for (const festival of ctx.festivals) {
    const festivalCategories = ctx.ticketCategories.filter((c) => c.festivalId === festival.id);

    // Determine number of tickets based on festival status
    const ticketsToCreate =
      festival.status === FestivalStatus.COMPLETED
        ? 200
        : festival.status === FestivalStatus.ONGOING
          ? 150
          : 100;

    for (let i = 0; i < ticketsToCreate; i++) {
      const user = randomElement(regularUsers);
      const category = randomElement(festivalCategories);

      // Create payment
      const paymentStatus =
        festival.status === FestivalStatus.PUBLISHED
          ? randomElement([PaymentStatus.COMPLETED, PaymentStatus.COMPLETED, PaymentStatus.PENDING])
          : PaymentStatus.COMPLETED;

      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          amount: category.price,
          currency: 'EUR',
          status: paymentStatus,
          provider: randomElement([
            PaymentProvider.STRIPE,
            PaymentProvider.STRIPE,
            PaymentProvider.PAYPAL,
          ]),
          providerPaymentId:
            paymentStatus === PaymentStatus.COMPLETED
              ? `pi_${crypto.randomBytes(12).toString('hex')}`
              : null,
          description: `Achat ${category.name} - ${festival.name}`,
          paidAt:
            paymentStatus === PaymentStatus.COMPLETED
              ? randomDate(randomPastDate(90, 120), new Date())
              : null,
        },
      });

      ctx.payments.push({ id: payment.id, userId: payment.userId });
      paymentCount++;

      // Create ticket
      const ticketStatus =
        festival.status === FestivalStatus.COMPLETED
          ? randomElement([
              TicketStatus.USED,
              TicketStatus.USED,
              TicketStatus.USED,
              TicketStatus.CANCELLED,
              TicketStatus.REFUNDED,
            ])
          : festival.status === FestivalStatus.ONGOING
            ? randomElement([TicketStatus.SOLD, TicketStatus.SOLD, TicketStatus.USED])
            : TicketStatus.SOLD;

      const qrCode = generateQRCode();
      const ticket = await prisma.ticket.create({
        data: {
          festivalId: festival.id,
          categoryId: category.id,
          userId: user.id,
          qrCode,
          qrCodeData: JSON.stringify({
            ticketId: qrCode,
            festivalId: festival.id,
            categoryId: category.id,
            userId: user.id,
            type: category.type,
          }),
          status: ticketStatus,
          purchasePrice: category.price,
          usedAt:
            ticketStatus === TicketStatus.USED ? randomDate(festival.startDate, new Date()) : null,
          paymentId: payment.id,
        },
      });

      ctx.tickets.push({
        id: ticket.id,
        festivalId: ticket.festivalId,
        userId: ticket.userId,
      });
      ticketCount++;
    }

    log(`Created ${ticketsToCreate} tickets for ${festival.name}`, 1);
  }

  log(`Total: ${paymentCount} payments, ${ticketCount} tickets`, 1);
}

async function seedCashless(ctx: SeedContext): Promise<void> {
  logStep(10, 12, 'Creating cashless accounts and transactions...');

  const regularUsers = ctx.users.filter((u) => u.role === UserRole.USER);
  let transactionCount = 0;

  // Create cashless accounts for 80% of regular users
  const usersWithCashless = regularUsers.slice(0, Math.floor(regularUsers.length * 0.8));

  for (const user of usersWithCashless) {
    const initialBalance = randomFloat(20, 150);

    const account = await prisma.cashlessAccount.create({
      data: {
        userId: user.id,
        balance: initialBalance,
        nfcTagId: generateNFCTag(),
        isActive: true,
      },
    });

    ctx.cashlessAccounts.push({ id: account.id, userId: account.userId });

    // Create transactions for ongoing/completed festivals
    const activeFestivals = ctx.festivals.filter((f) => f.status !== FestivalStatus.PUBLISHED);

    for (const festival of activeFestivals) {
      let currentBalance = 0;

      // Initial top-up
      const topupAmount = randomFloat(50, 200);
      await prisma.cashlessTransaction.create({
        data: {
          accountId: account.id,
          festivalId: festival.id,
          type: TransactionType.TOPUP,
          amount: topupAmount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + topupAmount,
          description: 'Rechargement initial',
        },
      });
      currentBalance += topupAmount;
      transactionCount++;

      // Random purchases (3-8 per user per festival)
      const purchaseCount = randomInt(3, 8);
      for (let i = 0; i < purchaseCount; i++) {
        const amount = randomFloat(5, 25);
        if (currentBalance >= amount) {
          await prisma.cashlessTransaction.create({
            data: {
              accountId: account.id,
              festivalId: festival.id,
              type: TransactionType.PAYMENT,
              amount,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance - amount,
              description: randomElement([
                'Achat nourriture',
                'Achat boissons',
                'Merchandising',
                'Snacks',
                'Bar',
              ]),
            },
          });
          currentBalance -= amount;
          transactionCount++;
        }
      }

      // Maybe add another top-up
      if (Math.random() > 0.6) {
        const topup2 = randomFloat(30, 80);
        await prisma.cashlessTransaction.create({
          data: {
            accountId: account.id,
            festivalId: festival.id,
            type: TransactionType.TOPUP,
            amount: topup2,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + topup2,
            description: 'Rechargement supplementaire',
          },
        });
        currentBalance += topup2;
        transactionCount++;
      }

      // Update final balance
      await prisma.cashlessAccount.update({
        where: { id: account.id },
        data: { balance: currentBalance },
      });
    }
  }

  log(`Created ${ctx.cashlessAccounts.length} cashless accounts`, 1);
  log(`Created ${transactionCount} transactions`, 1);
}

async function seedStaffAssignments(ctx: SeedContext): Promise<void> {
  logStep(11, 12, 'Creating staff assignments...');

  const staffUsers = ctx.users.filter(
    (u) => u.role === UserRole.STAFF || u.role === UserRole.SECURITY || u.role === UserRole.CASHIER
  );

  let assignmentCount = 0;

  for (const festival of ctx.festivals) {
    if (festival.status === FestivalStatus.PUBLISHED) {
      continue;
    } // No staff for future festivals

    const festivalZones = ctx.zones.filter((z) => z.festivalId === festival.id);
    const festivalDays = FESTIVAL_DATA.find((f) => f.name === festival.name)?.duration || 3;

    for (let day = 0; day < festivalDays; day++) {
      // Morning shift: 8:00 - 16:00
      // Evening shift: 16:00 - 00:00
      // Night shift: 00:00 - 08:00

      const shifts = [
        { start: 8, end: 16, name: 'Matin' },
        { start: 16, end: 24, name: 'Soir' },
        { start: 0, end: 8, name: 'Nuit' },
      ];

      for (const shift of shifts) {
        const assignedStaff = randomElements(staffUsers, randomInt(8, 15));

        for (const staff of assignedStaff) {
          const zone = Math.random() > 0.3 ? randomElement(festivalZones) : null;

          const startTime = new Date(festival.startDate);
          startTime.setDate(startTime.getDate() + day);
          startTime.setHours(shift.start, 0, 0, 0);

          const endTime = new Date(startTime);
          endTime.setHours(shift.end === 24 ? 23 : shift.end, shift.end === 24 ? 59 : 0, 0, 0);

          await prisma.staffAssignment.create({
            data: {
              userId: staff.id,
              festivalId: festival.id,
              zoneId: zone?.id || null,
              role: staff.role,
              startTime,
              endTime,
              isActive: true,
            },
          });

          assignmentCount++;
        }
      }
    }

    log(`Created staff assignments for ${festival.name}`, 1);
  }

  log(`Total: ${assignmentCount} staff assignments`, 1);
}

async function seedSupportAndFAQ(ctx: SeedContext): Promise<void> {
  logStep(12, 12, 'Creating FAQ, support tickets, and misc data...');

  // Create FAQ categories
  for (const categoryDef of FAQ_CATEGORIES) {
    const category = await prisma.faqCategory.create({
      data: {
        name: categoryDef.name,
        order: categoryDef.order,
      },
    });
    ctx.faqCategories.push({ id: category.id, name: category.name });
  }

  log(`Created ${ctx.faqCategories.length} FAQ categories`, 1);

  // Create FAQ items
  for (const itemDef of FAQ_ITEMS) {
    const category = ctx.faqCategories.find((c) => c.name === itemDef.category);
    if (!category) {
      continue;
    }

    await prisma.faqItem.create({
      data: {
        categoryId: category.id,
        question: itemDef.question,
        answer: itemDef.answer,
        order: itemDef.order,
        isActive: true,
      },
    });
  }

  log(`Created ${FAQ_ITEMS.length} FAQ items`, 1);

  // Create support tickets
  const regularUsers = ctx.users.filter((u) => u.role === UserRole.USER);
  const staffUsers = ctx.users.filter((u) => u.role === UserRole.STAFF);

  const supportSubjects = [
    'Probleme avec mon billet',
    'Remboursement demande',
    'Question sur le camping',
    'Cashless bloque',
    'Objet perdu',
    'Acces VIP refuse',
    'Probleme de paiement',
    'Demande dinformation',
    'Reclamation',
    'Suggestion damelioration',
  ];

  for (let i = 0; i < CONFIG.SUPPORT_TICKETS_COUNT; i++) {
    const user = randomElement(regularUsers);
    const festival = randomElement(ctx.festivals);
    const subject = randomElement(supportSubjects);

    const status = randomElement([
      SupportTicketStatus.OPEN,
      SupportTicketStatus.OPEN,
      SupportTicketStatus.IN_PROGRESS,
      SupportTicketStatus.WAITING_FOR_USER,
      SupportTicketStatus.RESOLVED,
      SupportTicketStatus.CLOSED,
    ]);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        festivalId: festival.id,
        subject,
        description: `Bonjour, je rencontre un probleme concernant: ${subject.toLowerCase()}. Pourriez-vous maider svp? Merci davance.`,
        status,
        priority: randomElement([
          Priority.LOW,
          Priority.MEDIUM,
          Priority.MEDIUM,
          Priority.HIGH,
          Priority.URGENT,
        ]),
        assignedTo: status !== SupportTicketStatus.OPEN ? randomElement(staffUsers).id : null,
      },
    });

    // Add messages to ticket
    if (status !== SupportTicketStatus.OPEN) {
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          message: `Bonjour, jai un probleme avec ${subject.toLowerCase()}. Pouvez-vous maider?`,
          isStaff: false,
        },
      });

      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: randomElement(staffUsers).id,
          message:
            'Bonjour, merci de nous avoir contactes. Nous examinons votre demande et revenons vers vous rapidement.',
          isStaff: true,
        },
      });
    }
  }

  log(`Created ${CONFIG.SUPPORT_TICKETS_COUNT} support tickets`, 1);

  // Create POIs for each festival
  for (const festival of ctx.festivals) {
    const city = FESTIVAL_DATA.find((f) => f.name === festival.name)?.city || FRENCH_CITIES[0];

    for (const poiDef of POI_TYPES_DATA) {
      await prisma.mapPoi.create({
        data: {
          festivalId: festival.id,
          name: poiDef.name,
          type: poiDef.type,
          description: `${poiDef.name} - ${festival.name}`,
          latitude: city.lat + randomFloat(-0.008, 0.008),
          longitude: city.lng + randomFloat(-0.008, 0.008),
          iconUrl: `https://example.com/icons/${poiDef.icon}.png`,
          isActive: true,
        },
      });
    }

    log(`Created ${POI_TYPES_DATA.length} POIs for ${festival.name}`, 1);
  }

  // Note: Camping spots require CampingZones to be created first
  // This will be implemented when the camping feature is fully built
  log('Skipping camping spots creation (requires CampingZone setup)', 1);

  // Create lost items
  const lostItemDescriptions = [
    'Telephone portable Samsung noir',
    'Portefeuille en cuir marron',
    'Cles de voiture avec porte-cles etoile',
    'Sac a dos Eastpak bleu',
    'Lunettes de soleil Ray-Ban',
    'Appareil photo Canon',
    'Bracelet en argent',
    'Chapeau de paille',
    'Gourde verte',
    'Veste en jean',
  ];

  for (const festival of ctx.festivals) {
    if (festival.status === FestivalStatus.PUBLISHED) {
      continue;
    }

    const lostItemCount = randomInt(5, 12);
    for (let i = 0; i < lostItemCount; i++) {
      const reporter = randomElement(regularUsers);
      const status = randomElement([
        LostItemStatus.REPORTED,
        LostItemStatus.REPORTED,
        LostItemStatus.FOUND,
        LostItemStatus.RETURNED,
        LostItemStatus.UNCLAIMED,
      ]);

      await prisma.lostItem.create({
        data: {
          festivalId: festival.id,
          reportedBy: reporter.id,
          description: randomElement(lostItemDescriptions),
          location: randomElement([
            'Scene Principale',
            'Food Court',
            'Camping',
            'Toilettes',
            'Bar Central',
            'Entree',
          ]),
          status,
          foundBy:
            status === LostItemStatus.FOUND || status === LostItemStatus.RETURNED
              ? randomElement(staffUsers).id
              : null,
          contactInfo: `${reporter.email}`,
          claimedAt: status === LostItemStatus.RETURNED ? randomPastDate(1, 5) : null,
        },
      });
    }

    log(`Created lost items for ${festival.name}`, 1);
  }
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main(): Promise<void> {
  logSection('FESTIVAL PLATFORM - DATABASE SEED');
  log(`Date: ${new Date().toISOString()}`);
  log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  const ctx: SeedContext = {
    users: [],
    festivals: [],
    ticketCategories: [],
    zones: [],
    artists: [],
    stages: [],
    vendors: [],
    products: [],
    cashlessAccounts: [],
    tickets: [],
    payments: [],
    faqCategories: [],
  };

  try {
    await cleanDatabase();

    await seedUsers(ctx);
    await seedFestivals(ctx);
    await seedTicketCategories(ctx);
    await seedZones(ctx);
    await seedArtists(ctx);
    await seedStages(ctx);
    await seedPerformances(ctx);
    await seedVendors(ctx);
    await seedPaymentsAndTickets(ctx);
    await seedCashless(ctx);
    await seedStaffAssignments(ctx);
    await seedSupportAndFAQ(ctx);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    logSection('SEED COMPLETED SUCCESSFULLY');

    console.log('\n--- Data Summary ---');
    console.log(`  Users:              ${ctx.users.length}`);
    console.log(`  Festivals:          ${ctx.festivals.length}`);
    console.log(`  Ticket Categories:  ${ctx.ticketCategories.length}`);
    console.log(`  Zones:              ${ctx.zones.length}`);
    console.log(`  Artists:            ${ctx.artists.length}`);
    console.log(`  Stages:             ${ctx.stages.length}`);
    console.log(`  Vendors:            ${ctx.vendors.length}`);
    console.log(`  Products:           ${ctx.products.length}`);
    console.log(`  Tickets:            ${ctx.tickets.length}`);
    console.log(`  Payments:           ${ctx.payments.length}`);
    console.log(`  Cashless Accounts:  ${ctx.cashlessAccounts.length}`);
    console.log(`  FAQ Categories:     ${ctx.faqCategories.length}`);

    console.log('\n--- Test Credentials ---');
    console.log(`Password for all accounts: ${CONFIG.SEED_PASSWORD}`);
    console.log('\nDemo accounts:');
    console.log('  ADMIN:      admin@festival.fr');
    console.log('  ORGANIZER:  organisateur@festival.fr');
    console.log('  STAFF:      staff@festival.fr');
    console.log('  CASHIER:    caissier@festival.fr');
    console.log('  SECURITY:   securite@festival.fr');
    console.log('  USER:       user@festival.fr');

    console.log('\n--- Festivals ---');
    for (const festival of ctx.festivals) {
      console.log(`  ${festival.name}`);
      console.log(`    Status: ${festival.status}`);
      console.log(`    Date: ${festival.startDate.toLocaleDateString('fr-FR')}`);
    }
  } catch (error) {
    console.error('\n[ERROR] Seed failed:', error);
    throw error;
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
