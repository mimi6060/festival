# Database Seeding Guide

This guide documents the database seeding process for the Festival Platform. The seed script populates the database with realistic French test data for development and testing purposes.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Seed Data Overview](#seed-data-overview)
3. [Demo Accounts](#demo-accounts)
4. [Festivals Created](#festivals-created)
5. [Data Structure Details](#data-structure-details)
6. [Customizing Seeds](#customizing-seeds)
7. [Production Considerations](#production-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- PostgreSQL database running
- Environment variables configured (`.env` file)
- Node.js dependencies installed

### Running the Seed

```bash
# Run the seed script
npx prisma db seed

# Or with reset (drops all data first)
npx prisma migrate reset
```

### What Happens

1. **Database Cleanup**: All existing data is deleted in dependency order
2. **Users**: Demo and random users are created with all roles
3. **Festivals**: 4 festivals with different statuses (COMPLETED, ONGOING, PUBLISHED)
4. **Ticket Categories**: 15 categories per festival
5. **Zones**: 15 zones per festival
6. **Artists**: 25 French/international artists
7. **Stages & Performances**: 6 stages per festival with scheduled performances
8. **Vendors & Products**: 15 vendors with 6 products each per festival
9. **Tickets & Payments**: ~450 tickets with associated payments
10. **Cashless Accounts**: Accounts with transactions for active festivals
11. **Staff Assignments**: Work schedules for staff members
12. **Support Data**: FAQ, support tickets, POIs, lost items

---

## Seed Data Overview

### Summary Statistics

| Entity            | Count per Festival | Total (4 Festivals) |
| ----------------- | ------------------ | ------------------- |
| Users             | -                  | ~55                 |
| Festivals         | -                  | 4                   |
| Ticket Categories | 15                 | 60                  |
| Zones             | 15                 | 60                  |
| Artists           | -                  | 25                  |
| Stages            | 6                  | 24                  |
| Performances      | ~30                | ~120                |
| Vendors           | 15                 | 60                  |
| Products          | 90                 | 360                 |
| Tickets           | ~110               | ~450                |
| Cashless Accounts | -                  | ~16                 |
| Transactions      | -                  | ~250                |
| Staff Assignments | -                  | ~35                 |
| FAQ Items         | -                  | 17                  |
| Support Tickets   | -                  | 15                  |
| POIs              | 27                 | 108                 |

---

## Demo Accounts

All demo accounts use the same password for easy testing:

**Password for all accounts**: `Festival2025!`

### Account List

| Role      | Email                      | Description                        |
| --------- | -------------------------- | ---------------------------------- |
| ADMIN     | `admin@festival.fr`        | Full platform access               |
| ORGANIZER | `organisateur@festival.fr` | Festival creation and management   |
| STAFF     | `staff@festival.fr`        | Festival operations support        |
| CASHIER   | `caissier@festival.fr`     | Cashless payment processing        |
| SECURITY  | `securite@festival.fr`     | Access control and zone management |
| USER      | `user@festival.fr`         | Regular festival attendee          |

### Additional Users by Role

| Role      | Count | Email Pattern                         |
| --------- | ----- | ------------------------------------- |
| ADMIN     | 2     | `{firstname}.{lastname}{id}@email.fr` |
| ORGANIZER | 3     | `{firstname}.{lastname}{id}@email.fr` |
| STAFF     | 12    | `{firstname}.{lastname}{id}@email.fr` |
| CASHIER   | 6     | `{firstname}.{lastname}{id}@email.fr` |
| SECURITY  | 8     | `{firstname}.{lastname}{id}@email.fr` |
| USER      | 20    | `{firstname}.{lastname}{id}@email.fr` |

---

## Festivals Created

The seed creates 4 festivals with different statuses to test various scenarios:

### 1. Electric Dreams 2025

- **Status**: PUBLISHED (Future festival)
- **Location**: Domaine National de Chambord
- **Duration**: 4 days
- **Capacity**: 40,000
- **Start Date**: ~230 days from now

### 2. Les Nuits Electriques

- **Status**: COMPLETED (Past festival)
- **Location**: Plage du Grand Travers, Palavas-les-Flots
- **Duration**: 3 days
- **Capacity**: 45,000
- **Start Date**: ~60 days ago

### 3. Rock en Provence

- **Status**: ONGOING (Current festival)
- **Location**: Domaine de la Brillanne, Aix-en-Provence
- **Duration**: 4 days
- **Capacity**: 35,000
- **Start Date**: Yesterday (active!)

### 4. Summer Vibes Festival

- **Status**: PUBLISHED (Upcoming festival)
- **Location**: Esplanade Saint-Jean-dAcre, La Rochelle
- **Duration**: 3 days
- **Capacity**: 55,000
- **Start Date**: ~45 days from now

---

## Data Structure Details

### Ticket Categories (15 per Festival)

| Type      | Categories                                          | Price Range  |
| --------- | --------------------------------------------------- | ------------ |
| STANDARD  | Pass 1 Jour (Ven/Sam/Dim), Pass 3 Jours, Early Bird | 49-139 EUR   |
| VIP       | Pass VIP 1 Jour, Pass VIP 3 Jours                   | 149-349 EUR  |
| BACKSTAGE | Pass Backstage, Pass Backstage Premium              | 899-1499 EUR |
| CAMPING   | Camping Standard, Camping Confort                   | 45-89 EUR    |
| PARKING   | Pass Parking                                        | 25 EUR       |
| COMBO     | Festival+Camping, VIP+Parking, Family Pack          | 175-399 EUR  |

### Zones (15 per Festival)

- **Performance Areas**: Scene Principale, Scene Electro, Scene Acoustique, Scene Discovery, Scene DJ Set
- **VIP Areas**: Espace VIP, Backstage & Loges
- **Food & Drink**: Food Court Principal, Food Court VIP, Bar Central
- **Amenities**: Zone Detente, Village Partenaires
- **Camping**: Camping Standard, Camping Premium
- **Parking**: Parking Festival

### Artists (25 Total)

French and international artists across genres:

- **Electro/EDM**: DJ Snake, Kungs, Petit Biscuit, The Blaze, Polo & Pan, Rone, Vladimir Cauchemar
- **Pop**: Christine and the Queens, Angele, Clara Luciani, Juliette Armanet, Suzane
- **Rap/Hip-Hop**: PNL, Orelsan, Nekfeu, SCH, Lomepal, Vald, Booba, Josman
- **Alternative**: Woodkid, Flavien Berger, La Femme
- **Other**: Aya Nakamura, Sofiane Pamart

### Vendors (15 per Festival)

| Type        | Vendors                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FOOD        | Le Gourmet Burger, Pizza Napoli, Sushi Time, Tacos El Fuego, Crepes Bretonnes, Glaces Artisanales, Asian Street Food, Le Petit Bistrot |
| BAR         | Le Bar a Cocktails, Bieres Artisanales, Wine & Co                                                                                      |
| DRINK       | Fresh Bar, Coffee Corner                                                                                                               |
| MERCHANDISE | Festival Merch, Vinyl Paradise                                                                                                         |

Each vendor has 6 products with realistic French names and prices.

### Points of Interest (27 per Festival)

- Stages (3)
- Food areas (2)
- Bars (2)
- Toilettes (3)
- Medical posts (2)
- Info points (2)
- ATMs (2)
- Parking (2)
- Camping areas (2)
- Entrances/Exits (3)
- Phone charging stations (2)
- Lockers (2)

### FAQ Categories

1. Billetterie
2. Acces & Transport
3. Sur le site
4. Camping
5. Cashless

Each category has 3-4 Q&A items.

---

## Customizing Seeds

### Configuration Constants

Edit the `CONFIG` object in `prisma/seed.ts`:

```typescript
const CONFIG = {
  SEED_PASSWORD: 'Festival2025!', // Password for all accounts
  BCRYPT_ROUNDS: 10, // Password hashing rounds
  USERS_COUNT: 55, // Total users
  TICKETS_COUNT: 550, // Total tickets
  ARTISTS_COUNT: 25, // Total artists
  PERFORMANCES_COUNT: 120, // Total performances
  TRANSACTIONS_COUNT: 250, // Total cashless transactions
  PRODUCTS_COUNT: 60, // Products per festival
  STAFF_ASSIGNMENTS_COUNT: 35, // Total staff assignments
  FAQ_ITEMS_COUNT: 25, // Total FAQ items
  SUPPORT_TICKETS_COUNT: 15, // Total support tickets
};
```

### Adding More Test Data

#### Add a New Festival

Add to the `FESTIVAL_DATA` array:

```typescript
{
  name: 'My New Festival',
  slug: 'my-new-festival-2025',
  description: 'Description of the festival...',
  location: 'City Name',
  address: 'Full address',
  city: { name: 'City', lat: 48.8566, lng: 2.3522 },
  status: FestivalStatus.PUBLISHED,
  daysOffset: 90,  // Days from now (negative = past)
  duration: 3,
  maxCapacity: 30000,
}
```

#### Add New Artists

Add to the `ARTIST_DATA` array:

```typescript
{
  name: 'Artist Name',
  genre: 'Genre / Sub-genre',
  bio: 'Artist biography...',
  imageUrl: 'https://example.com/artist.jpg',
  spotifyUrl: 'https://open.spotify.com/artist/xxx',
  instagramUrl: 'https://instagram.com/artist',
}
```

#### Add New Ticket Categories

Add to the `TICKET_CATEGORIES` array:

```typescript
{
  name: 'New Category Name',
  type: TicketType.VIP,  // STANDARD, VIP, BACKSTAGE, CAMPING, PARKING, COMBO
  price: 199.0,
  quota: 500,
  maxPerUser: 2,
  description: 'Category description',
}
```

#### Add New Vendors

Add to the `VENDOR_DATA` array:

```typescript
{
  name: 'Vendor Name',
  type: VendorType.FOOD,  // FOOD, BAR, DRINK, MERCHANDISE
  description: 'Vendor description',
  products: ['Product 1', 'Product 2', 'Product 3'],
}
```

### Environment-Specific Seeding

Create separate seed scripts for different environments:

```typescript
// prisma/seed-minimal.ts - Minimal data for CI/CD
// prisma/seed-full.ts - Full dataset for development
// prisma/seed-stress.ts - Large dataset for performance testing

// In package.json:
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "scripts": {
    "seed:minimal": "ts-node prisma/seed-minimal.ts",
    "seed:full": "ts-node prisma/seed-full.ts",
    "seed:stress": "ts-node prisma/seed-stress.ts"
  }
}
```

### Conditional Seeding

Add environment checks in your seed:

```typescript
async function main() {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    console.log('Seed blocked in production!');
    process.exit(1);
  }

  if (env === 'test') {
    // Minimal seeding for tests
    await seedMinimal();
  } else {
    // Full seeding for development
    await seedFull();
  }
}
```

---

## Production Considerations

### NEVER Run Seed in Production

The seed script:

- **Deletes all existing data** before seeding
- Creates users with **known passwords**
- Contains **test data** not suitable for production

### Environment Protection

Add this check at the start of `seed.ts`:

```typescript
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed script cannot run in production!');
  process.exit(1);
}
```

### Creating Admin User Manually

For production, create the admin user via:

#### Option 1: Direct Database Insert

```sql
INSERT INTO "User" (
  id, email, "passwordHash", "firstName", "lastName",
  role, status, "emailVerified", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  '$2b$10$...hashed_password...',  -- Use bcrypt to hash
  'Admin',
  'User',
  'ADMIN',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

#### Option 2: One-Time Script

Create `scripts/create-admin.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD required');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log(`Admin user created: ${email}`);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run with:

```bash
ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD=SecurePass123! npx ts-node scripts/create-admin.ts
```

#### Option 3: API Endpoint (Recommended)

Use the `/auth/register` endpoint, then update the role via database:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"SecurePass123!","firstName":"Admin","lastName":"User"}'

# Update role in database
psql -c "UPDATE \"User\" SET role='ADMIN' WHERE email='admin@yourcompany.com';"
```

### Data Migration vs Seeding

For production data initialization, use migrations instead of seeds:

```bash
# Create a migration for initial required data
npx prisma migrate dev --name add_initial_data

# In the migration file, add INSERT statements
```

---

## Troubleshooting

### Common Issues

#### 1. Seed Fails with "Unique constraint violated"

**Cause**: Database already has data with conflicting unique fields.

**Solution**:

```bash
# Reset the database
npx prisma migrate reset

# Or clean manually
npx prisma db push --force-reset
```

#### 2. Seed Takes Too Long

**Cause**: Large dataset with many relations.

**Solution**: Reduce counts in `CONFIG`:

```typescript
const CONFIG = {
  USERS_COUNT: 10,
  TICKETS_COUNT: 50,
  // ... reduce other values
};
```

#### 3. "Cannot find module '@prisma/client'"

**Cause**: Prisma client not generated.

**Solution**:

```bash
npx prisma generate
```

#### 4. Foreign Key Constraint Errors

**Cause**: Entities being created before their dependencies.

**Solution**: Check the seed order in `main()`. Dependencies must be created first:

1. Users
2. Festivals
3. Ticket Categories
4. Zones
5. Artists
6. Stages
7. etc.

#### 5. Memory Issues with Large Seeds

**Cause**: Too many entities being created at once.

**Solution**: Add batch processing:

```typescript
// Instead of creating all at once
for (let i = 0; i < 10000; i++) {
  await prisma.user.create({...});
}

// Batch creates
const batchSize = 100;
for (let i = 0; i < 10000; i += batchSize) {
  await prisma.user.createMany({
    data: users.slice(i, i + batchSize),
  });
}
```

### Verifying Seed Success

After running the seed, verify with:

```bash
# Check record counts
npx prisma studio

# Or via psql
psql -d festival -c "SELECT COUNT(*) FROM \"User\""
psql -d festival -c "SELECT COUNT(*) FROM \"Festival\""
psql -d festival -c "SELECT COUNT(*) FROM \"Ticket\""
```

### Logs

The seed script outputs progress:

```
============================================================
FESTIVAL PLATFORM - DATABASE SEED
============================================================
Date: 2025-01-08T12:00:00.000Z
Environment: development

============================================================
CLEANING DATABASE
============================================================
Database cleaned successfully

[1/12] Creating users...
  Demo user: admin@festival.fr (ADMIN)
  Demo user: organisateur@festival.fr (ORGANIZER)
  ...

[2/12] Creating festivals...
  Festival: Electric Dreams 2025 (PUBLISHED)
  ...
```

---

## Related Documentation

- [API Reference](./api/API_REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing](./CONTRIBUTING.md)

---

_Last updated: 2026-01-08_
