import { PrismaClient, UserRole, UserStatus, FestivalStatus, TicketType } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hash function for seed data (use bcrypt in production)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@festival.com' },
    update: {},
    create: {
      email: 'admin@festival.com',
      passwordHash: hashPassword('Admin123!'),
      firstName: 'Admin',
      lastName: 'Festival',
      phone: '+33600000000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create Organizer User
  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@festival.com' },
    update: {},
    create: {
      email: 'organizer@festival.com',
      passwordHash: hashPassword('Organizer123!'),
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '+33611111111',
      role: UserRole.ORGANIZER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('Created organizer user:', organizerUser.email);

  // Create Staff User
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@festival.com' },
    update: {},
    create: {
      email: 'staff@festival.com',
      passwordHash: hashPassword('Staff123!'),
      firstName: 'Marie',
      lastName: 'Martin',
      phone: '+33622222222',
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('Created staff user:', staffUser.email);

  // Create Regular User
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@festival.com' },
    update: {},
    create: {
      email: 'user@festival.com',
      passwordHash: hashPassword('User123!'),
      firstName: 'Pierre',
      lastName: 'Bernard',
      phone: '+33633333333',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });
  console.log('Created regular user:', regularUser.email);

  // Create Test Festival
  const festival = await prisma.festival.upsert({
    where: { slug: 'summer-music-fest-2025' },
    update: {},
    create: {
      name: 'Summer Music Fest 2025',
      slug: 'summer-music-fest-2025',
      description: 'Le plus grand festival de musique de l\'ete! 3 jours de concerts, food trucks, et bonne ambiance.',
      location: 'Parc des Expositions',
      address: '1 Avenue du Festival, 75001 Paris',
      startDate: new Date('2025-07-15T14:00:00Z'),
      endDate: new Date('2025-07-17T23:00:00Z'),
      status: FestivalStatus.PUBLISHED,
      maxCapacity: 50000,
      currentAttendees: 0,
      logoUrl: 'https://example.com/logo.png',
      bannerUrl: 'https://example.com/banner.jpg',
      websiteUrl: 'https://summermusicfest.com',
      contactEmail: 'contact@summermusicfest.com',
      timezone: 'Europe/Paris',
      currency: 'EUR',
    },
  });
  console.log('Created festival:', festival.name);

  // Create Ticket Categories
  const standardCategory = await prisma.ticketCategory.upsert({
    where: { id: 'standard-ticket-category' },
    update: {},
    create: {
      id: 'standard-ticket-category',
      festivalId: festival.id,
      name: 'Pass 3 Jours - Standard',
      description: 'Acces a toutes les scenes pendant 3 jours',
      type: TicketType.STANDARD,
      price: 149.99,
      quota: 30000,
      soldCount: 0,
      maxPerUser: 4,
      saleStartDate: new Date('2025-01-01T00:00:00Z'),
      saleEndDate: new Date('2025-07-14T23:59:59Z'),
      isActive: true,
    },
  });
  console.log('Created ticket category:', standardCategory.name);

  const vipCategory = await prisma.ticketCategory.upsert({
    where: { id: 'vip-ticket-category' },
    update: {},
    create: {
      id: 'vip-ticket-category',
      festivalId: festival.id,
      name: 'Pass 3 Jours - VIP',
      description: 'Acces VIP avec espace lounge, open bar, et vue privilegiee',
      type: TicketType.VIP,
      price: 399.99,
      quota: 2000,
      soldCount: 0,
      maxPerUser: 2,
      saleStartDate: new Date('2025-01-01T00:00:00Z'),
      saleEndDate: new Date('2025-07-14T23:59:59Z'),
      isActive: true,
    },
  });
  console.log('Created ticket category:', vipCategory.name);

  const backstageCategory = await prisma.ticketCategory.upsert({
    where: { id: 'backstage-ticket-category' },
    update: {},
    create: {
      id: 'backstage-ticket-category',
      festivalId: festival.id,
      name: 'Pass Backstage',
      description: 'Acces exclusif aux coulisses et meet & greet avec les artistes',
      type: TicketType.BACKSTAGE,
      price: 999.99,
      quota: 100,
      soldCount: 0,
      maxPerUser: 1,
      saleStartDate: new Date('2025-01-01T00:00:00Z'),
      saleEndDate: new Date('2025-07-10T23:59:59Z'),
      isActive: true,
    },
  });
  console.log('Created ticket category:', backstageCategory.name);

  const campingCategory = await prisma.ticketCategory.upsert({
    where: { id: 'camping-ticket-category' },
    update: {},
    create: {
      id: 'camping-ticket-category',
      festivalId: festival.id,
      name: 'Option Camping',
      description: 'Emplacement camping pour la duree du festival',
      type: TicketType.CAMPING,
      price: 59.99,
      quota: 5000,
      soldCount: 0,
      maxPerUser: 2,
      saleStartDate: new Date('2025-01-01T00:00:00Z'),
      saleEndDate: new Date('2025-07-14T23:59:59Z'),
      isActive: true,
    },
  });
  console.log('Created ticket category:', campingCategory.name);

  const parkingCategory = await prisma.ticketCategory.upsert({
    where: { id: 'parking-ticket-category' },
    update: {},
    create: {
      id: 'parking-ticket-category',
      festivalId: festival.id,
      name: 'Pass Parking',
      description: 'Place de parking reservee',
      type: TicketType.PARKING,
      price: 29.99,
      quota: 3000,
      soldCount: 0,
      maxPerUser: 2,
      saleStartDate: new Date('2025-01-01T00:00:00Z'),
      saleEndDate: new Date('2025-07-17T12:00:00Z'),
      isActive: true,
    },
  });
  console.log('Created ticket category:', parkingCategory.name);

  // Create Zones
  const mainStageZone = await prisma.zone.create({
    data: {
      festivalId: festival.id,
      name: 'Scene Principale',
      description: 'Zone principale avec la grande scene',
      capacity: 40000,
      requiresTicketType: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE],
      isActive: true,
    },
  });
  console.log('Created zone:', mainStageZone.name);

  const vipZone = await prisma.zone.create({
    data: {
      festivalId: festival.id,
      name: 'Espace VIP',
      description: 'Lounge VIP avec vue sur la scene principale',
      capacity: 2000,
      requiresTicketType: [TicketType.VIP, TicketType.BACKSTAGE],
      isActive: true,
    },
  });
  console.log('Created zone:', vipZone.name);

  const backstageZone = await prisma.zone.create({
    data: {
      festivalId: festival.id,
      name: 'Backstage',
      description: 'Coulisses et loges des artistes',
      capacity: 200,
      requiresTicketType: [TicketType.BACKSTAGE],
      isActive: true,
    },
  });
  console.log('Created zone:', backstageZone.name);

  const campingZone = await prisma.zone.create({
    data: {
      festivalId: festival.id,
      name: 'Zone Camping',
      description: 'Espace camping avec sanitaires et douches',
      capacity: 5000,
      requiresTicketType: [TicketType.CAMPING],
      isActive: true,
    },
  });
  console.log('Created zone:', campingZone.name);

  const foodCourtZone = await prisma.zone.create({
    data: {
      festivalId: festival.id,
      name: 'Food Court',
      description: 'Zone restauration avec food trucks',
      capacity: 10000,
      requiresTicketType: [TicketType.STANDARD, TicketType.VIP, TicketType.BACKSTAGE],
      isActive: true,
    },
  });
  console.log('Created zone:', foodCourtZone.name);

  // Create Staff Assignments
  await prisma.staffAssignment.create({
    data: {
      userId: staffUser.id,
      festivalId: festival.id,
      zoneId: mainStageZone.id,
      role: UserRole.SECURITY,
      startTime: new Date('2025-07-15T12:00:00Z'),
      endTime: new Date('2025-07-15T22:00:00Z'),
      isActive: true,
    },
  });
  console.log('Created staff assignment for:', staffUser.email);

  // Create Cashless Account for regular user
  const cashlessAccount = await prisma.cashlessAccount.create({
    data: {
      userId: regularUser.id,
      balance: 0,
      nfcTagId: 'NFC-' + crypto.randomBytes(8).toString('hex').toUpperCase(),
      isActive: true,
    },
  });
  console.log('Created cashless account for:', regularUser.email, 'NFC Tag:', cashlessAccount.nfcTagId);

  console.log('\n--- Seed completed successfully! ---');
  console.log('\nTest credentials:');
  console.log('Admin: admin@festival.com / Admin123!');
  console.log('Organizer: organizer@festival.com / Organizer123!');
  console.log('Staff: staff@festival.com / Staff123!');
  console.log('User: user@festival.com / User123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
