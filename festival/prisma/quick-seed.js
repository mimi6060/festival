const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@festival.com' },
    update: {},
    create: {
      email: 'admin@festival.com',
      passwordHash: hashedPassword,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+33612345678',
    },
  });
  console.log('Created admin:', admin.email);

  // Create organizer
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@festival.com' },
    update: {},
    create: {
      email: 'organizer@festival.com',
      passwordHash: hashedPassword,
      firstName: 'Marie',
      lastName: 'Martin',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      phone: '+33623456789',
    },
  });
  console.log('Created organizer:', organizer.email);

  // Create staff users
  const staffNames = [
    { first: 'Pierre', last: 'Durand' },
    { first: 'Sophie', last: 'Bernard' },
    { first: 'Lucas', last: 'Petit' },
    { first: 'Emma', last: 'Robert' },
    { first: 'Hugo', last: 'Richard' },
  ];

  for (let i = 0; i < staffNames.length; i++) {
    await prisma.user.upsert({
      where: { email: `staff${i+1}@festival.com` },
      update: {},
      create: {
        email: `staff${i+1}@festival.com`,
        passwordHash: hashedPassword,
        firstName: staffNames[i].first,
        lastName: staffNames[i].last,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });
  }
  console.log('Created 5 staff users');

  // Create regular users
  const userNames = [
    { first: 'Alice', last: 'Moreau' },
    { first: 'Bob', last: 'Leroy' },
    { first: 'Claire', last: 'Garcia' },
    { first: 'David', last: 'Thomas' },
    { first: 'Eva', last: 'Lefebvre' },
    { first: 'François', last: 'Girard' },
    { first: 'Gabrielle', last: 'Mercier' },
    { first: 'Henri', last: 'Dupuis' },
    { first: 'Isabelle', last: 'Lambert' },
    { first: 'Jacques', last: 'Bonnet' },
  ];

  for (let i = 0; i < userNames.length; i++) {
    await prisma.user.upsert({
      where: { email: `user${i+1}@test.com` },
      update: {},
      create: {
        email: `user${i+1}@test.com`,
        passwordHash: hashedPassword,
        firstName: userNames[i].first,
        lastName: userNames[i].last,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
  }
  console.log('Created 10 regular users');

  // Create festivals
  const festival1 = await prisma.festival.upsert({
    where: { slug: 'electric-dreams-2025' },
    update: {},
    create: {
      name: 'Electric Dreams Festival 2025',
      slug: 'electric-dreams-2025',
      description: 'Le plus grand festival electro de France',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-18'),
      location: 'Parc de la Villette, Paris',
      address: '211 Avenue Jean Jaurès, 75019 Paris',
      maxCapacity: 50000,
      status: 'PUBLISHED',
      organizerId: organizer.id,
      timezone: 'Europe/Paris',
      currency: 'EUR',
    },
  });
  console.log('Created festival:', festival1.name);

  const festival2 = await prisma.festival.upsert({
    where: { slug: 'summer-vibes-2025' },
    update: {},
    create: {
      name: 'Summer Vibes Festival',
      slug: 'summer-vibes-2025',
      description: 'Festival de musique en plein air',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-08-03'),
      location: 'Plage du Prado, Marseille',
      address: 'Avenue du Prado, 13008 Marseille',
      maxCapacity: 30000,
      status: 'PUBLISHED',
      organizerId: organizer.id,
      timezone: 'Europe/Paris',
      currency: 'EUR',
    },
  });
  console.log('Created festival:', festival2.name);

  const festival3 = await prisma.festival.upsert({
    where: { slug: 'rock-en-seine-2025' },
    update: {},
    create: {
      name: 'Rock en Seine 2025',
      slug: 'rock-en-seine-2025',
      description: 'Festival rock incontournable',
      startDate: new Date('2025-08-22'),
      endDate: new Date('2025-08-24'),
      location: 'Domaine de Saint-Cloud, 92210',
      maxCapacity: 40000,
      status: 'PUBLISHED',
      organizerId: organizer.id,
      timezone: 'Europe/Paris',
      currency: 'EUR',
    },
  });
  console.log('Created festival:', festival3.name);

  // Create ticket categories
  const categories = [
    { name: 'Pass 1 Jour', price: 59, quota: 10000, festivalId: festival1.id, type: 'STANDARD' },
    { name: 'Pass 3 Jours', price: 149, quota: 5000, festivalId: festival1.id, type: 'STANDARD' },
    { name: 'Pass VIP', price: 299, quota: 500, festivalId: festival1.id, type: 'VIP' },
    { name: 'Entrée Générale', price: 45, quota: 8000, festivalId: festival2.id, type: 'STANDARD' },
    { name: 'Pass Week-end', price: 89, quota: 3000, festivalId: festival2.id, type: 'STANDARD' },
    { name: 'Pass VIP Week-end', price: 199, quota: 200, festivalId: festival2.id, type: 'VIP' },
    { name: 'Pass 1 Jour Rock', price: 69, quota: 12000, festivalId: festival3.id, type: 'STANDARD' },
    { name: 'Pass 3 Jours Rock', price: 159, quota: 8000, festivalId: festival3.id, type: 'STANDARD' },
  ];

  for (const cat of categories) {
    await prisma.ticketCategory.create({
      data: {
        name: cat.name,
        description: `Billet ${cat.name}`,
        price: cat.price,
        quota: cat.quota,
        soldCount: Math.floor(cat.quota * 0.3),
        type: cat.type,
        festivalId: cat.festivalId,
        saleStartDate: new Date(),
        saleEndDate: new Date('2025-07-14'),
        isActive: true,
      },
    });
  }
  console.log('Created', categories.length, 'ticket categories');

  // Create cashless accounts for users
  const users = await prisma.user.findMany({ where: { role: 'USER' } });
  for (const user of users) {
    await prisma.cashlessAccount.upsert({
      where: {
        festivalId_ownerId: {
          festivalId: festival1.id,
          ownerId: user.id
        }
      },
      update: {},
      create: {
        festivalId: festival1.id,
        ownerId: user.id,
        balance: Math.floor(Math.random() * 200) + 20,
        nfcTagId: `NFC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        isActive: true,
      },
    });
  }
  console.log('Created cashless accounts for users');

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest accounts (password: Admin123!):');
  console.log('  Admin: admin@festival.com');
  console.log('  Organizer: organizer@festival.com');
  console.log('  Staff: staff1@festival.com - staff5@festival.com');
  console.log('  Users: user1@test.com - user10@test.com');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
