/**
 * Seed script for SummerStrömming Festival
 *
 * This script creates the SummerStrömming Festival 2025 with all its data:
 * - Festival details
 * - Stages
 * - Ticket categories
 * - Artists lineup (to be determined)
 * - Vendors (bar, food)
 * - POIs
 *
 * Run with: npx ts-node prisma/seed-summerstromming.ts
 */

import { PrismaClient, FestivalStatus, TicketType, VendorType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSummerStromming() {
  console.log('🎪 Starting SummerStrömming Festival seed...');

  // Find or create an organizer user
  let organizer = await prisma.user.findFirst({
    where: { email: 'robin.saidane@summerstromming.be' },
  });

  if (!organizer) {
    organizer = await prisma.user.create({
      data: {
        email: 'robin.saidane@summerstromming.be',
        firstName: 'Robin',
        lastName: 'Saidane',
        role: 'ORGANIZER',
        status: 'ACTIVE',
        emailVerified: true,
        passwordHash: '$2b$10$dummyHashForSeedData123456789', // Placeholder
      },
    });
    console.log('✅ Created organizer: Robin Saidane');
  }

  // Create or update the festival
  const festival = await prisma.festival.upsert({
    where: { slug: 'summerstromming-2025' },
    update: {},
    create: {
      organizerId: organizer.id,
      name: 'SummerStrömming Festival 2025',
      slug: 'summerstromming-2025',
      description: `🟠🟡 Le SummerStrömming est de retour pour sa sixième édition !! 🟡🟠

Pour cette édition estivale 2025, nous prévoyons comme d'habitude un chapiteau ainsi qu'un terrain pour que les festivaliers puissent planter leur tente et passer 24H tous ensemble! 🏕

🎵 Concert de différents groupes ainsi que notre DJ résident pour animer la soirée 🎶

🍺 Nous prévoyons plusieurs pompes et fûts Jupiler ainsi que, comme chaque année, des fûts de bières spéciales! Préparez votre foie, la bière coulera à flots durant 2 belles journées.

🔒 Sécurité assurée par Axel Security

❤️ Si certains d'entre vous sont motivés pour nous aider (déco, montage, démontage, organisation...), n'hésitez pas à vous manifester !

🎤 Si vous connaissez des groupes, DJ, chanteurs ou que vous-même voulez montrer vos talents sur scène, envoyez-nous un MP !

🔥 L'événement ne se fait QUE sous forme d'un forfait incluant : bières, bières spéciales et soft à volonté durant la durée de l'événement !`,
      location: 'Vitrival, Namur, Belgique',
      address: 'Rue Lotria 1/7, 5070 Le Roux, Fosses-la-Ville',
      startDate: new Date('2025-09-13T12:00:00+02:00'),
      endDate: new Date('2025-09-14T12:00:00+02:00'),
      status: FestivalStatus.PUBLISHED,
      maxCapacity: 300,
      currentAttendees: 168,
      logoUrl: null, // TODO: Add logo
      bannerUrl: null, // TODO: Add banner from Facebook
      websiteUrl: 'https://www.facebook.com/events/1234350357984448/',
      contactEmail: 'summerstromming@gmail.com',
      timezone: 'Europe/Brussels',
      currency: 'EUR',
      genres: ['Electronic', 'Rock', 'Pop', 'Live Music'],
      isFeatured: true,
    },
  });
  console.log('✅ Created/updated festival:', festival.name);

  // Create stages
  const stages = [
    {
      name: 'Chapiteau Principal',
      description: 'Scène principale sous chapiteau avec concerts live et DJ sets',
      capacity: 200,
      location: 'Centre du terrain',
    },
    {
      name: 'Zone DJ',
      description: 'Espace DJ résident pour animer la soirée',
      capacity: 100,
      location: 'Proche du bar',
    },
  ];

  for (const stageData of stages) {
    await prisma.stage.upsert({
      where: {
        id: `${festival.id}-${stageData.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: stageData,
      create: {
        id: `${festival.id}-${stageData.name.toLowerCase().replace(/\s+/g, '-')}`,
        festivalId: festival.id,
        ...stageData,
      },
    });
  }
  console.log('✅ Created stages');

  // Create ticket categories
  const ticketCategories = [
    {
      name: 'Early Bird',
      description: 'Forfait tout inclus - Bières, bières spéciales et soft à volonté. Prix early bird jusqu\'au 13 août.',
      type: TicketType.STANDARD,
      price: 35.0,
      quota: 100,
      soldCount: 80,
      saleStartDate: new Date('2025-06-01'),
      saleEndDate: new Date('2025-08-13'),
      maxPerUser: 4,
    },
    {
      name: 'Tarif Normal',
      description: 'Forfait tout inclus - Bières, bières spéciales et soft à volonté. Du 14 août au 10 septembre.',
      type: TicketType.STANDARD,
      price: 40.0,
      quota: 100,
      soldCount: 60,
      saleStartDate: new Date('2025-08-14'),
      saleEndDate: new Date('2025-09-10'),
      maxPerUser: 4,
    },
    {
      name: 'Last Minute',
      description: 'Forfait tout inclus - Bières, bières spéciales et soft à volonté. Tarif dernière minute.',
      type: TicketType.STANDARD,
      price: 45.0,
      quota: 50,
      soldCount: 10,
      saleStartDate: new Date('2025-09-11'),
      saleEndDate: new Date('2025-09-12'),
      maxPerUser: 4,
    },
    {
      name: 'Camping',
      description: 'Emplacement pour planter votre tente sur le terrain du festival (inclus dans le forfait)',
      type: TicketType.CAMPING,
      price: 0.0, // Inclus
      quota: 150,
      soldCount: 100,
      saleStartDate: new Date('2025-06-01'),
      saleEndDate: new Date('2025-09-12'),
      maxPerUser: 2,
    },
  ];

  for (const ticketData of ticketCategories) {
    await prisma.ticketCategory.upsert({
      where: {
        id: `${festival.id}-${ticketData.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: ticketData,
      create: {
        id: `${festival.id}-${ticketData.name.toLowerCase().replace(/\s+/g, '-')}`,
        festivalId: festival.id,
        ...ticketData,
      },
    });
  }
  console.log('✅ Created ticket categories');

  // Create vendors (Bar)
  const barVendor = await prisma.vendor.upsert({
    where: { id: `${festival.id}-bar-principal` },
    update: {},
    create: {
      id: `${festival.id}-bar-principal`,
      festivalId: festival.id,
      ownerId: organizer.id,
      name: 'Bar SummerStrömming',
      description: 'Bar principal avec bières Jupiler, bières spéciales et softs',
      type: VendorType.BAR,
      location: 'Proche de la scène principale',
      isOpen: true,
    },
  });

  // Create drinks/products for the bar
  const drinks = [
    { name: 'Jupiler 25cl', description: 'Bière blonde belge', price: 0, category: 'Bières', stock: 1000 },
    { name: 'Jupiler 50cl', description: 'Bière blonde belge - Grand format', price: 0, category: 'Bières', stock: 500 },
    { name: 'Bière Spéciale', description: 'Sélection de bières spéciales belges', price: 0, category: 'Bières Spéciales', stock: 300 },
    { name: 'Coca-Cola', description: 'Soft drink classique', price: 0, category: 'Softs', stock: 500 },
    { name: 'Sprite', description: 'Soft drink citron-lime', price: 0, category: 'Softs', stock: 300 },
    { name: 'Eau', description: 'Eau minérale', price: 0, category: 'Softs', stock: 500 },
    { name: 'Red Bull', description: 'Energy drink (supplément possible)', price: 3, category: 'Energy', stock: 200 },
  ];

  for (const drink of drinks) {
    await prisma.vendorProduct.upsert({
      where: { id: `${barVendor.id}-${drink.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: drink,
      create: {
        id: `${barVendor.id}-${drink.name.toLowerCase().replace(/\s+/g, '-')}`,
        vendorId: barVendor.id,
        ...drink,
      },
    });
  }
  console.log('✅ Created bar vendor with drinks');

  // Create POIs
  const pois = [
    { name: 'Entrée Principale', type: 'ENTRANCE' as const, latitude: 50.4167, longitude: 4.5833 },
    { name: 'Chapiteau', type: 'STAGE' as const, latitude: 50.4168, longitude: 4.5835 },
    { name: 'Bar Principal', type: 'DRINK' as const, latitude: 50.4169, longitude: 4.5834 },
    { name: 'Zone Camping', type: 'CAMPING' as const, latitude: 50.4170, longitude: 4.5836 },
    { name: 'Toilettes', type: 'TOILET' as const, latitude: 50.4166, longitude: 4.5832 },
    { name: 'Poste de Secours', type: 'MEDICAL' as const, latitude: 50.4165, longitude: 4.5831 },
    { name: 'Accueil / Info', type: 'INFO' as const, latitude: 50.4167, longitude: 4.5830 },
  ];

  for (const poi of pois) {
    await prisma.mapPoi.upsert({
      where: { id: `${festival.id}-poi-${poi.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: poi,
      create: {
        id: `${festival.id}-poi-${poi.name.toLowerCase().replace(/\s+/g, '-')}`,
        festivalId: festival.id,
        ...poi,
        isActive: true,
      },
    });
  }
  console.log('✅ Created POIs');

  // Create some sample artists (local bands - to be replaced with real lineup)
  const artists = [
    { name: 'DJ Résident SummerStrömming', genre: 'Electronic', bio: 'Notre DJ résident qui anime chaque édition depuis le début!' },
    { name: 'Local Band 1', genre: 'Rock', bio: 'Groupe local de rock' },
    { name: 'Local Band 2', genre: 'Pop', bio: 'Groupe local de pop' },
  ];

  for (const artistData of artists) {
    const artist = await prisma.artist.upsert({
      where: { id: `summerstromming-${artistData.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: artistData,
      create: {
        id: `summerstromming-${artistData.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...artistData,
      },
    });

    // Create a performance for this artist
    const stage = await prisma.stage.findFirst({ where: { festivalId: festival.id } });
    if (stage) {
      await prisma.performance.upsert({
        where: { id: `${festival.id}-${artist.id}-performance` },
        update: {},
        create: {
          id: `${festival.id}-${artist.id}-performance`,
          artistId: artist.id,
          stageId: stage.id,
          startTime: new Date('2025-09-13T20:00:00+02:00'),
          endTime: new Date('2025-09-13T22:00:00+02:00'),
        },
      });
    }
  }
  console.log('✅ Created sample artists and performances');

  console.log('\n🎉 SummerStrömming Festival 2025 seed completed successfully!');
  console.log(`   Festival ID: ${festival.id}`);
  console.log(`   Slug: ${festival.slug}`);
}

async function main() {
  try {
    await seedSummerStromming();
  } catch (error) {
    console.error('❌ Error seeding SummerStrömming:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
