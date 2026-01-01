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
} from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEMO_MODE = process.env.SEED_DEMO_MODE === 'true';
const SEED_PASSWORD = 'Festival2025!';

// ============================================================================
// HELPER FUNCTIONS - Random Data Generation
// ============================================================================

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomPhoneNumber(): string {
  return `+336${randomInt(10000000, 99999999)}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// DATA POOLS - Realistic French Names and Data
// ============================================================================

const FIRST_NAMES = [
  'Jean', 'Pierre', 'Marie', 'Sophie', 'Antoine', 'Camille', 'Lucas', 'Emma',
  'Hugo', 'Chloe', 'Louis', 'Lea', 'Gabriel', 'Manon', 'Raphael', 'Juliette',
  'Arthur', 'Charlotte', 'Jules', 'Alice', 'Adam', 'Louise', 'Ethan', 'Sarah',
  'Nathan', 'Ines', 'Thomas', 'Clemence', 'Theo', 'Oceane',
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois',
  'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David',
  'Bertrand', 'Morel', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert', 'Fontaine',
  'Rousseau', 'Vincent', 'Muller', 'Lefevre', 'Faure', 'Andre',
];

const FESTIVAL_NAMES = [
  { name: 'Summer Music Fest 2025', location: 'Parc des Expositions, Paris' },
  { name: 'Electronic Beach Festival', location: 'Plage du Prado, Marseille' },
  { name: 'Rock en Seine 2025', location: 'Domaine de Saint-Cloud, Paris' },
];

const FESTIVAL_DESCRIPTIONS = [
  'Le plus grand festival de musique de l\'ete! 3 jours de concerts, food trucks, et bonne ambiance.',
  'Festival electronique en bord de mer avec les meilleurs DJs internationaux.',
  'Le rendez-vous incontournable des amateurs de rock et musiques alternatives.',
];

const TICKET_CATEGORY_TEMPLATES = [
  { name: 'Pass 1 Jour', type: TicketType.STANDARD, price: 59.99, quota: 15000, maxPerUser: 6 },
  { name: 'Pass 3 Jours - Standard', type: TicketType.STANDARD, price: 149.99, quota: 30000, maxPerUser: 4 },
  { name: 'Pass 3 Jours - VIP', type: TicketType.VIP, price: 399.99, quota: 2000, maxPerUser: 2 },
  { name: 'Pass Backstage', type: TicketType.BACKSTAGE, price: 999.99, quota: 100, maxPerUser: 1 },
  { name: 'Option Camping Standard', type: TicketType.CAMPING, price: 59.99, quota: 5000, maxPerUser: 2 },
  { name: 'Option Camping Premium', type: TicketType.CAMPING, price: 129.99, quota: 1000, maxPerUser: 2 },
  { name: 'Pass Parking', type: TicketType.PARKING, price: 29.99, quota: 3000, maxPerUser: 2 },
  { name: 'Pass Parking VIP', type: TicketType.PARKING, price: 79.99, quota: 500, maxPerUser: 1 },
  { name: 'Combo Festival + Camping', type: TicketType.COMBO, price: 199.99, quota: 3000, maxPerUser: 2 },
  { name: 'Combo VIP + Parking', type: TicketType.COMBO, price: 449.99, quota: 1000, maxPerUser: 2 },
];

const ZONE_TEMPLATES = [
  { name: 'Scene Principale', description: 'Zone principale avec la grande scene', capacity: 40000, types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE] },
  { name: 'Scene Electro', description: 'Scene dediee aux musiques electroniques', capacity: 15000, types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE] },
  { name: 'Scene Acoustique', description: 'Scene intimiste pour concerts acoustiques', capacity: 5000, types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE] },
  { name: 'Espace VIP', description: 'Lounge VIP avec vue sur la scene principale', capacity: 2000, types: [TicketType.VIP, TicketType.BACKSTAGE] },
  { name: 'Backstage', description: 'Coulisses et loges des artistes', capacity: 200, types: [TicketType.BACKSTAGE] },
  { name: 'Zone Camping', description: 'Espace camping avec sanitaires et douches', capacity: 5000, types: [TicketType.CAMPING] },
  { name: 'Food Court', description: 'Zone restauration avec food trucks', capacity: 10000, types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE] },
  { name: 'Zone Detente', description: 'Espace chill-out avec hamacs et transats', capacity: 3000, types: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE] },
];

// ============================================================================
// RANDOM DATA GENERATORS
// ============================================================================

interface RandomUserOptions {
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
}

function randomUser(options: RandomUserOptions = {}): {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
} {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const uniqueId = randomInt(1000, 9999);

  return {
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueId}@email.com`,
    passwordHash: hashPassword(SEED_PASSWORD),
    firstName,
    lastName,
    phone: randomPhoneNumber(),
    role: options.role ?? UserRole.USER,
    status: options.status ?? UserStatus.ACTIVE,
    emailVerified: options.emailVerified ?? true,
  };
}

interface RandomFestivalOptions {
  status?: FestivalStatus;
  organizerId: string;
}

function randomFestival(index: number, options: RandomFestivalOptions): {
  organizerId: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  address: string;
  startDate: Date;
  endDate: Date;
  status: FestivalStatus;
  maxCapacity: number;
  currentAttendees: number;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  contactEmail: string;
  timezone: string;
  currency: string;
} {
  const template = FESTIVAL_NAMES[index % FESTIVAL_NAMES.length];
  const startDate = new Date('2025-07-15');
  startDate.setDate(startDate.getDate() + index * 30);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 2);

  const slug = slugify(template.name);

  return {
    organizerId: options.organizerId,
    name: template.name,
    slug: `${slug}-${index}`,
    description: FESTIVAL_DESCRIPTIONS[index % FESTIVAL_DESCRIPTIONS.length],
    location: template.location.split(',')[0],
    address: template.location,
    startDate,
    endDate,
    status: options.status ?? FestivalStatus.PUBLISHED,
    maxCapacity: randomInt(20000, 60000),
    currentAttendees: 0,
    logoUrl: `https://example.com/festivals/${slug}/logo.png`,
    bannerUrl: `https://example.com/festivals/${slug}/banner.jpg`,
    websiteUrl: `https://${slug}.com`,
    contactEmail: `contact@${slug}.com`,
    timezone: 'Europe/Paris',
    currency: 'EUR',
  };
}

function randomTicketCategory(festivalId: string, template: typeof TICKET_CATEGORY_TEMPLATES[0], festivalStartDate: Date): {
  festivalId: string;
  name: string;
  description: string;
  type: TicketType;
  price: number;
  quota: number;
  soldCount: number;
  maxPerUser: number;
  saleStartDate: Date;
  saleEndDate: Date;
  isActive: boolean;
} {
  const saleStartDate = new Date('2025-01-01');
  const saleEndDate = new Date(festivalStartDate);
  saleEndDate.setDate(saleEndDate.getDate() - 1);

  return {
    festivalId,
    name: template.name,
    description: `Acces ${template.name.toLowerCase()} pour le festival`,
    type: template.type,
    price: template.price,
    quota: template.quota,
    soldCount: 0,
    maxPerUser: template.maxPerUser,
    saleStartDate,
    saleEndDate,
    isActive: true,
  };
}

function randomTicket(
  festivalId: string,
  categoryId: string,
  userId: string,
  purchasePrice: number,
  status: TicketStatus = TicketStatus.SOLD
): {
  festivalId: string;
  categoryId: string;
  userId: string;
  qrCode: string;
  qrCodeData: string;
  status: TicketStatus;
  purchasePrice: number;
  usedAt: Date | null;
} {
  const qrCode = generateQRCode();
  return {
    festivalId,
    categoryId,
    userId,
    qrCode,
    qrCodeData: JSON.stringify({ ticketId: qrCode, festivalId, categoryId, userId }),
    status,
    purchasePrice,
    usedAt: status === TicketStatus.USED ? randomDate(new Date('2025-07-15'), new Date('2025-07-17')) : null,
  };
}

function randomPayment(
  userId: string,
  amount: number,
  status: PaymentStatus = PaymentStatus.COMPLETED
): {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  description: string;
  paidAt: Date | null;
} {
  return {
    userId,
    amount,
    currency: 'EUR',
    status,
    provider: randomElement([PaymentProvider.STRIPE, PaymentProvider.PAYPAL]),
    providerPaymentId: status === PaymentStatus.COMPLETED ? `pi_${crypto.randomBytes(12).toString('hex')}` : null,
    description: 'Achat de billets festival',
    paidAt: status === PaymentStatus.COMPLETED ? randomDate(new Date('2025-01-15'), new Date('2025-06-30')) : null,
  };
}

function randomZone(festivalId: string, template: typeof ZONE_TEMPLATES[0]): {
  festivalId: string;
  name: string;
  description: string;
  capacity: number;
  requiresTicketType: TicketType[];
  isActive: boolean;
} {
  return {
    festivalId,
    name: template.name,
    description: template.description,
    capacity: template.capacity,
    requiresTicketType: template.types,
    isActive: true,
  };
}

function randomStaffAssignment(
  userId: string,
  festivalId: string,
  zoneId: string | null,
  role: UserRole,
  dayOffset: number
): {
  userId: string;
  festivalId: string;
  zoneId: string | null;
  role: UserRole;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
} {
  const startTime = new Date('2025-07-15T08:00:00Z');
  startTime.setDate(startTime.getDate() + dayOffset);

  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 8);

  return {
    userId,
    festivalId,
    zoneId,
    role,
    startTime,
    endTime,
    isActive: true,
  };
}

function randomCashlessTransaction(
  accountId: string,
  festivalId: string,
  type: TransactionType,
  amount: number,
  balanceBefore: number
): {
  accountId: string;
  festivalId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
} {
  const balanceAfter = type === TransactionType.TOPUP || type === TransactionType.REFUND
    ? balanceBefore + amount
    : balanceBefore - amount;

  const descriptions: Record<TransactionType, string[]> = {
    [TransactionType.TOPUP]: ['Rechargement carte', 'Credit compte cashless'],
    [TransactionType.PAYMENT]: ['Achat nourriture', 'Achat boissons', 'Merchandising', 'Snacks'],
    [TransactionType.REFUND]: ['Remboursement', 'Correction erreur'],
    [TransactionType.TRANSFER]: ['Transfert entre comptes'],
    [TransactionType.CORRECTION]: ['Correction administrative'],
  };

  return {
    accountId,
    festivalId,
    type,
    amount: Math.abs(amount),
    balanceBefore,
    balanceAfter,
    description: randomElement(descriptions[type]),
  };
}

// ============================================================================
// DEMO DATA - Predefined users for testing
// ============================================================================

const DEMO_USERS = [
  { email: 'admin@festival.com', firstName: 'Admin', lastName: 'Festival', role: UserRole.ADMIN },
  { email: 'organizer@festival.com', firstName: 'Jean', lastName: 'Dupont', role: UserRole.ORGANIZER },
  { email: 'staff@festival.com', firstName: 'Marie', lastName: 'Martin', role: UserRole.STAFF },
  { email: 'cashier@festival.com', firstName: 'Paul', lastName: 'Bernard', role: UserRole.CASHIER },
  { email: 'security@festival.com', firstName: 'Thomas', lastName: 'Leroy', role: UserRole.SECURITY },
  { email: 'user@festival.com', firstName: 'Pierre', lastName: 'Moreau', role: UserRole.USER },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log(DEMO_MODE ? 'SEEDING DATABASE (DEMO MODE)' : 'SEEDING DATABASE');
  console.log('='.repeat(60));

  // ============================================================================
  // STEP 1: CREATE USERS (5 per role = 30 total)
  // ============================================================================
  console.log('\n[1/8] Creating users...');

  const usersByRole: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: [],
    [UserRole.ORGANIZER]: [],
    [UserRole.STAFF]: [],
    [UserRole.CASHIER]: [],
    [UserRole.SECURITY]: [],
    [UserRole.USER]: [],
  };

  // Create demo users first (for predictable test credentials)
  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: {
        email: demoUser.email,
        passwordHash: hashPassword(SEED_PASSWORD),
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        phone: randomPhoneNumber(),
        role: demoUser.role,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
    usersByRole[demoUser.role].push(user.id);
    console.log(`  Created demo user: ${user.email} (${user.role})`);
  }

  // Create additional random users (4 more per role)
  for (const role of Object.values(UserRole)) {
    for (let i = 0; i < 4; i++) {
      const userData = randomUser({ role, status: UserStatus.ACTIVE });
      const user = await prisma.user.create({ data: userData });
      usersByRole[role].push(user.id);
    }
    console.log(`  Created 4 additional ${role} users`);
  }

  const allUserIds = Object.values(usersByRole).flat();
  const regularUserIds = usersByRole[UserRole.USER];
  console.log(`  Total users created: ${allUserIds.length}`);

  // ============================================================================
  // STEP 2: CREATE FESTIVALS (3 with different statuses)
  // ============================================================================
  console.log('\n[2/8] Creating festivals...');

  const festivalStatuses = [FestivalStatus.DRAFT, FestivalStatus.PUBLISHED, FestivalStatus.ONGOING];
  const festivals: { id: string; startDate: Date; status: FestivalStatus }[] = [];

  for (let i = 0; i < 3; i++) {
    const organizerId = usersByRole[UserRole.ORGANIZER][i % usersByRole[UserRole.ORGANIZER].length];
    const festivalData = randomFestival(i, {
      organizerId,
      status: festivalStatuses[i],
    });

    const festival = await prisma.festival.create({ data: festivalData });
    festivals.push({ id: festival.id, startDate: festival.startDate, status: festival.status });
    console.log(`  Created festival: ${festival.name} (${festival.status})`);
  }

  // ============================================================================
  // STEP 3: CREATE TICKET CATEGORIES (10 varied categories)
  // ============================================================================
  console.log('\n[3/8] Creating ticket categories...');

  const ticketCategories: { id: string; festivalId: string; price: number; type: TicketType }[] = [];

  for (const festival of festivals) {
    // Create 3-4 categories per festival to reach 10 total
    const categoriesToCreate = festival === festivals[0] ? 4 : 3;
    const templates = randomElements(TICKET_CATEGORY_TEMPLATES, categoriesToCreate);

    for (const template of templates) {
      const categoryData = randomTicketCategory(festival.id, template, festival.startDate);
      const category = await prisma.ticketCategory.create({ data: categoryData });
      ticketCategories.push({
        id: category.id,
        festivalId: category.festivalId,
        price: parseFloat(category.price.toString()),
        type: category.type,
      });
      console.log(`  Created category: ${category.name}`);
    }
  }

  // ============================================================================
  // STEP 4: CREATE ZONES (5 per festival = 15 total)
  // ============================================================================
  console.log('\n[4/8] Creating zones...');

  const zones: { id: string; festivalId: string }[] = [];

  for (const festival of festivals) {
    const zoneTemplates = randomElements(ZONE_TEMPLATES, 5);
    for (const template of zoneTemplates) {
      const zoneData = randomZone(festival.id, template);
      const zone = await prisma.zone.create({ data: zoneData });
      zones.push({ id: zone.id, festivalId: zone.festivalId });
    }
    console.log(`  Created 5 zones for festival ${festival.id.substring(0, 8)}...`);
  }

  // ============================================================================
  // STEP 5: CREATE PAYMENTS (20 total)
  // ============================================================================
  console.log('\n[5/8] Creating payments...');

  const payments: { id: string; userId: string; amount: number }[] = [];
  const paymentStatuses = [
    PaymentStatus.COMPLETED, PaymentStatus.COMPLETED, PaymentStatus.COMPLETED,
    PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.FAILED,
  ];

  for (let i = 0; i < 20; i++) {
    const userId = randomElement(regularUserIds);
    const amount = randomFloat(50, 500);
    const status = paymentStatuses[i % paymentStatuses.length];

    const paymentData = randomPayment(userId, amount, status);
    const payment = await prisma.payment.create({ data: paymentData });
    payments.push({ id: payment.id, userId: payment.userId, amount: parseFloat(payment.amount.toString()) });
  }
  console.log(`  Created ${payments.length} payments`);

  // ============================================================================
  // STEP 6: CREATE TICKETS (50 with different statuses)
  // ============================================================================
  console.log('\n[6/8] Creating tickets...');

  const ticketStatuses = [
    TicketStatus.SOLD, TicketStatus.SOLD, TicketStatus.SOLD,
    TicketStatus.USED, TicketStatus.USED,
    TicketStatus.CANCELLED, TicketStatus.REFUNDED,
  ];

  for (let i = 0; i < 50; i++) {
    const category = randomElement(ticketCategories);
    const userId = randomElement(regularUserIds);
    const status = ticketStatuses[i % ticketStatuses.length];
    const payment = payments.find(p => p.userId === userId) ?? randomElement(payments);

    const ticketData = randomTicket(category.festivalId, category.id, userId, category.price, status);

    await prisma.ticket.create({
      data: {
        ...ticketData,
        paymentId: payment.id,
      },
    });

    // Update sold count
    if (status === TicketStatus.SOLD || status === TicketStatus.USED) {
      await prisma.ticketCategory.update({
        where: { id: category.id },
        data: { soldCount: { increment: 1 } },
      });
    }
  }
  console.log('  Created 50 tickets');

  // ============================================================================
  // STEP 7: CREATE CASHLESS ACCOUNTS & TRANSACTIONS
  // ============================================================================
  console.log('\n[7/8] Creating cashless accounts and transactions...');

  const cashlessAccounts: { id: string; festivalId: string }[] = [];

  // Create 10 cashless accounts
  for (let i = 0; i < 10; i++) {
    const userId = regularUserIds[i % regularUserIds.length];

    // Check if user already has a cashless account
    const existing = await prisma.cashlessAccount.findUnique({ where: { userId } });
    if (existing) {
      cashlessAccounts.push({ id: existing.id, festivalId: festivals[0].id });
      continue;
    }

    const initialBalance = randomFloat(0, 100);
    const account = await prisma.cashlessAccount.create({
      data: {
        userId,
        balance: initialBalance,
        nfcTagId: generateNFCTag(),
        isActive: true,
      },
    });
    cashlessAccounts.push({ id: account.id, festivalId: festivals[0].id });
    console.log(`  Created cashless account: ${account.nfcTagId}`);
  }

  // Create transactions for each account
  for (const account of cashlessAccounts) {
    let balance = randomFloat(0, 50);

    // Initial top-up
    const topupAmount = randomFloat(50, 150);
    await prisma.cashlessTransaction.create({
      data: randomCashlessTransaction(account.id, account.festivalId, TransactionType.TOPUP, topupAmount, balance),
    });
    balance += topupAmount;

    // Random purchases (2-4 per account)
    const purchaseCount = randomInt(2, 4);
    for (let i = 0; i < purchaseCount; i++) {
      const purchaseAmount = randomFloat(5, 25);
      if (balance >= purchaseAmount) {
        await prisma.cashlessTransaction.create({
          data: randomCashlessTransaction(account.id, account.festivalId, TransactionType.PAYMENT, purchaseAmount, balance),
        });
        balance -= purchaseAmount;
      }
    }

    // Update final balance
    await prisma.cashlessAccount.update({
      where: { id: account.id },
      data: { balance },
    });
  }
  console.log('  Created transactions for 10 cashless accounts');

  // ============================================================================
  // STEP 8: CREATE STAFF ASSIGNMENTS (10 total)
  // ============================================================================
  console.log('\n[8/8] Creating staff assignments...');

  const staffRoles = [UserRole.STAFF, UserRole.SECURITY, UserRole.CASHIER];
  const staffUserIds = [...usersByRole[UserRole.STAFF], ...usersByRole[UserRole.SECURITY], ...usersByRole[UserRole.CASHIER]];

  for (let i = 0; i < 10; i++) {
    const userId = staffUserIds[i % staffUserIds.length];
    const festival = festivals[i % festivals.length];
    const festivalZones = zones.filter(z => z.festivalId === festival.id);
    const zone = festivalZones.length > 0 ? randomElement(festivalZones) : null;
    const role = staffRoles[i % staffRoles.length];

    const assignmentData = randomStaffAssignment(userId, festival.id, zone?.id ?? null, role, i % 3);

    await prisma.staffAssignment.create({ data: assignmentData });
  }
  console.log('  Created 10 staff assignments');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));

  console.log('\nData Summary:');
  console.log(`  - Users: ${allUserIds.length} (5 per role)`);
  console.log(`  - Festivals: ${festivals.length}`);
  console.log(`  - Ticket Categories: ${ticketCategories.length}`);
  console.log(`  - Zones: ${zones.length}`);
  console.log(`  - Payments: ${payments.length}`);
  console.log('  - Tickets: 50');
  console.log(`  - Cashless Accounts: ${cashlessAccounts.length}`);
  console.log('  - Staff Assignments: 10');

  console.log('\n--- Test Credentials ---');
  console.log(`Password for all demo accounts: ${SEED_PASSWORD}`);
  console.log('\nDemo accounts:');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(10)} : ${user.email}`);
  }

  console.log('\n--- Additional Models (To Be Implemented) ---');
  console.log('The following models are referenced but not yet in schema:');
  console.log('  - Artist (20 planned)');
  console.log('  - Stage (3 per festival)');
  console.log('  - Performance (30 planned)');
  console.log('  - CampingSpot (10 planned)');
  console.log('  - CampingReservation (5 planned)');
  console.log('  - Vendor (10 planned)');
  console.log('  - POI (50 planned)');
  console.log('  - Notification (20 planned)');
  console.log('  - FAQ (10 planned)');
  console.log('  - SupportTicket (5 planned)');
}

// ============================================================================
// EXECUTE SEED
// ============================================================================

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
