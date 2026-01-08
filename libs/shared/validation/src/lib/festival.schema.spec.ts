/**
 * Unit tests for festival validation schemas
 */

import {
  festivalStatusEnum,
  coordinatesSchema,
  addressSchema,
  venueSchema,
  createFestivalSchema,
  updateFestivalSchema,
  festivalQuerySchema,
  festivalIdSchema,
  festivalSlugSchema,
  publishFestivalSchema,
  festivalSettingsSchema,
  festivalStatsQuerySchema,
} from './festival.schema';

describe('festival.schema', () => {
  // ============================================================================
  // Festival Status Enum
  // ============================================================================

  describe('festivalStatusEnum', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed'];
      validStatuses.forEach((status) => {
        const result = festivalStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = festivalStatusEnum.safeParse('invalid_status');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = festivalStatusEnum.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Coordinates Schema
  // ============================================================================

  describe('coordinatesSchema', () => {
    it('should accept valid coordinates', () => {
      const result = coordinatesSchema.safeParse({
        latitude: 48.8566,
        longitude: 2.3522,
      });
      expect(result.success).toBe(true);
    });

    it('should accept edge latitude values', () => {
      const minResult = coordinatesSchema.safeParse({ latitude: -90, longitude: 0 });
      const maxResult = coordinatesSchema.safeParse({ latitude: 90, longitude: 0 });
      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
    });

    it('should accept edge longitude values', () => {
      const minResult = coordinatesSchema.safeParse({ latitude: 0, longitude: -180 });
      const maxResult = coordinatesSchema.safeParse({ latitude: 0, longitude: 180 });
      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
    });

    it('should reject latitude below -90', () => {
      const result = coordinatesSchema.safeParse({ latitude: -91, longitude: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject latitude above 90', () => {
      const result = coordinatesSchema.safeParse({ latitude: 91, longitude: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject longitude below -180', () => {
      const result = coordinatesSchema.safeParse({ latitude: 0, longitude: -181 });
      expect(result.success).toBe(false);
    });

    it('should reject longitude above 180', () => {
      const result = coordinatesSchema.safeParse({ latitude: 0, longitude: 181 });
      expect(result.success).toBe(false);
    });

    it('should reject missing latitude', () => {
      const result = coordinatesSchema.safeParse({ longitude: 2.3522 });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Address Schema
  // ============================================================================

  describe('addressSchema', () => {
    const validAddress = {
      street: '10 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      country: 'FR',
    };

    it('should accept valid address', () => {
      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept address with optional fields', () => {
      const result = addressSchema.safeParse({
        ...validAddress,
        street2: 'Building A',
        state: 'Ile-de-France',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty street', () => {
      const result = addressSchema.safeParse({ ...validAddress, street: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty city', () => {
      const result = addressSchema.safeParse({ ...validAddress, city: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty postal code', () => {
      const result = addressSchema.safeParse({ ...validAddress, postalCode: '' });
      expect(result.success).toBe(false);
    });

    it('should reject country code not 2 characters', () => {
      const result = addressSchema.safeParse({ ...validAddress, country: 'FRA' });
      expect(result.success).toBe(false);
    });

    it('should reject too long street (>200 chars)', () => {
      const result = addressSchema.safeParse({ ...validAddress, street: 'A'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Venue Schema
  // ============================================================================

  describe('venueSchema', () => {
    const validVenue = {
      name: 'Parc des Expositions',
      address: {
        street: '10 Rue de Rivoli',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      },
    };

    it('should accept valid venue', () => {
      const result = venueSchema.safeParse(validVenue);
      expect(result.success).toBe(true);
    });

    it('should accept venue with all optional fields', () => {
      const result = venueSchema.safeParse({
        ...validVenue,
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
        capacity: 50000,
        description: 'A great venue for festivals',
        website: 'https://www.example.com',
        phone: '+33123456789',
        email: 'contact@venue.com',
        amenities: ['parking', 'toilets', 'food_court'],
        accessibilityInfo: 'Wheelchair accessible',
        parkingInfo: '5000 parking spots',
        publicTransportInfo: 'Metro Line 1',
      });
      expect(result.success).toBe(true);
    });

    it('should trim venue name', () => {
      const result = venueSchema.safeParse({
        ...validVenue,
        name: '  Parc des Expositions  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Parc des Expositions');
      }
    });

    it('should reject empty venue name', () => {
      const result = venueSchema.safeParse({ ...validVenue, name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject venue name too long (>200 chars)', () => {
      const result = venueSchema.safeParse({ ...validVenue, name: 'A'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = venueSchema.safeParse({ ...validVenue, email: 'invalid-email' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const result = venueSchema.safeParse({ ...validVenue, website: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('should reject negative capacity', () => {
      const result = venueSchema.safeParse({ ...validVenue, capacity: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer capacity', () => {
      const result = venueSchema.safeParse({ ...validVenue, capacity: 1000.5 });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Create Festival Schema
  // ============================================================================

  describe('createFestivalSchema', () => {
    const validFestival = {
      name: 'Summer Vibes Festival',
      startDate: '2025-07-15',
      endDate: '2025-07-17',
      timezone: 'Europe/Paris',
      venue: {
        name: 'Parc des Expositions',
        address: {
          street: '10 Rue de Rivoli',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
        },
      },
    };

    it('should accept valid festival data', () => {
      const result = createFestivalSchema.safeParse(validFestival);
      expect(result.success).toBe(true);
    });

    it('should accept festival with all optional fields', () => {
      const result = createFestivalSchema.safeParse({
        ...validFestival,
        slug: 'summer-vibes-2025',
        description: 'The best summer festival in Europe!',
        shortDescription: 'Best summer festival',
        logo: 'https://example.com/logo.png',
        banner: 'https://example.com/banner.png',
        website: 'https://www.summervibefest.com',
        email: 'info@summervibefest.com',
        phone: '+33123456789',
        socialLinks: {
          facebook: 'https://facebook.com/summervibefest',
          instagram: 'https://instagram.com/summervibefest',
        },
        tags: ['music', 'summer', 'outdoor'],
        genres: ['electronic', 'rock', 'pop'],
        ageRestriction: 18,
        languages: ['fr', 'en'],
      });
      expect(result.success).toBe(true);
    });

    it('should provide default values', () => {
      const result = createFestivalSchema.safeParse(validFestival);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
        expect(result.data.languages).toEqual(['fr']);
      }
    });

    it('should trim festival name', () => {
      const result = createFestivalSchema.safeParse({
        ...validFestival,
        name: '  Summer Vibes Festival  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Summer Vibes Festival');
      }
    });

    it('should reject name too short (<3 chars)', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, name: 'AB' });
      expect(result.success).toBe(false);
    });

    it('should reject name too long (>200 chars)', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, name: 'A'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject empty timezone', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, timezone: '' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format for startDate', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, startDate: '15-07-2025' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format for endDate', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, endDate: '2025/07/17' });
      expect(result.success).toBe(false);
    });

    it('should reject endDate before startDate', () => {
      const result = createFestivalSchema.safeParse({
        ...validFestival,
        startDate: '2025-07-17',
        endDate: '2025-07-15',
      });
      expect(result.success).toBe(false);
    });

    it('should accept same day festival (startDate equals endDate)', () => {
      const result = createFestivalSchema.safeParse({
        ...validFestival,
        startDate: '2025-07-15',
        endDate: '2025-07-15',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description too short (<10 chars)', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, description: 'Short' });
      expect(result.success).toBe(false);
    });

    it('should reject description too long (>5000 chars)', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, description: 'A'.repeat(5001) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, slug: 'Invalid Slug!' });
      expect(result.success).toBe(false);
    });

    it('should accept valid slug format', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, slug: 'summer-vibes-2025' });
      expect(result.success).toBe(true);
    });

    it('should reject ageRestriction below 0', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, ageRestriction: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject ageRestriction above 21', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, ageRestriction: 25 });
      expect(result.success).toBe(false);
    });

    it('should reject too many tags (>20)', () => {
      const result = createFestivalSchema.safeParse({
        ...validFestival,
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency code', () => {
      const result = createFestivalSchema.safeParse({ ...validFestival, currency: 'EURO' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Update Festival Schema
  // ============================================================================

  describe('updateFestivalSchema', () => {
    it('should accept empty update (all optional)', () => {
      const result = updateFestivalSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update', () => {
      const result = updateFestivalSchema.safeParse({
        name: 'Updated Festival Name',
        status: 'published',
      });
      expect(result.success).toBe(true);
    });

    it('should accept updating isPublished flag', () => {
      const result = updateFestivalSchema.safeParse({ isPublished: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublished).toBe(true);
      }
    });

    it('should accept updating isFeatured flag', () => {
      const result = updateFestivalSchema.safeParse({ isFeatured: true });
      expect(result.success).toBe(true);
    });

    it('should accept updating status', () => {
      const result = updateFestivalSchema.safeParse({ status: 'cancelled' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status in update', () => {
      const result = updateFestivalSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept partial venue update', () => {
      const result = updateFestivalSchema.safeParse({
        venue: { name: 'New Venue Name' },
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Festival Query Schema
  // ============================================================================

  describe('festivalQuerySchema', () => {
    it('should accept empty query with defaults', () => {
      const result = festivalQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept single status filter', () => {
      const result = festivalQuerySchema.safeParse({ status: 'published' });
      expect(result.success).toBe(true);
    });

    it('should accept array of status filters', () => {
      const result = festivalQuerySchema.safeParse({ status: ['published', 'ongoing'] });
      expect(result.success).toBe(true);
    });

    it('should accept date range filters', () => {
      const result = festivalQuerySchema.safeParse({
        startDateFrom: '2025-01-01',
        startDateTo: '2025-12-31',
      });
      expect(result.success).toBe(true);
    });

    it('should coerce boolean for isFeatured', () => {
      const result = festivalQuerySchema.safeParse({ isFeatured: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFeatured).toBe(true);
      }
    });

    it('should coerce boolean for hasAvailableTickets', () => {
      const result = festivalQuerySchema.safeParse({ hasAvailableTickets: '1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasAvailableTickets).toBe(true);
      }
    });

    it('should accept price range filters', () => {
      const result = festivalQuerySchema.safeParse({ minPrice: 0, maxPrice: 500 });
      expect(result.success).toBe(true);
    });

    it('should coerce page and limit numbers', () => {
      const result = festivalQuerySchema.safeParse({ page: '2', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject page less than 1', () => {
      const result = festivalQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const result = festivalQuerySchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });

    it('should accept sort options', () => {
      const result = festivalQuerySchema.safeParse({
        sortBy: 'startDate',
        sortOrder: 'asc',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sortBy value', () => {
      const result = festivalQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept search query', () => {
      const result = festivalQuerySchema.safeParse({ search: 'summer' });
      expect(result.success).toBe(true);
    });

    it('should reject search too long (>100 chars)', () => {
      const result = festivalQuerySchema.safeParse({ search: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should accept country code filter', () => {
      const result = festivalQuerySchema.safeParse({ country: 'FR' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid country code length', () => {
      const result = festivalQuerySchema.safeParse({ country: 'FRA' });
      expect(result.success).toBe(false);
    });

    it('should accept tags filter as string', () => {
      const result = festivalQuerySchema.safeParse({ tags: 'music' });
      expect(result.success).toBe(true);
    });

    it('should accept tags filter as array', () => {
      const result = festivalQuerySchema.safeParse({ tags: ['music', 'outdoor'] });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Festival ID and Slug Schemas
  // ============================================================================

  describe('festivalIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = festivalIdSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = festivalIdSchema.safeParse({ festivalId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('should reject missing festivalId', () => {
      const result = festivalIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('festivalSlugSchema', () => {
    it('should accept valid slug', () => {
      const result = festivalSlugSchema.safeParse({ slug: 'summer-vibes-2025' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug with uppercase', () => {
      const result = festivalSlugSchema.safeParse({ slug: 'Summer-Vibes' });
      expect(result.success).toBe(false);
    });

    it('should reject slug with spaces', () => {
      const result = festivalSlugSchema.safeParse({ slug: 'summer vibes' });
      expect(result.success).toBe(false);
    });

    it('should reject empty slug', () => {
      const result = festivalSlugSchema.safeParse({ slug: '' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Publish Festival Schema
  // ============================================================================

  describe('publishFestivalSchema', () => {
    it('should accept valid publish request', () => {
      const result = publishFestivalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should default notifySubscribers to true', () => {
      const result = publishFestivalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifySubscribers).toBe(true);
      }
    });

    it('should accept publish with scheduled date', () => {
      const result = publishFestivalSchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        publishAt: '2025-06-01',
        notifySubscribers: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid festivalId', () => {
      const result = publishFestivalSchema.safeParse({ festivalId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Festival Settings Schema
  // ============================================================================

  describe('festivalSettingsSchema', () => {
    it('should accept empty settings (all optional)', () => {
      const result = festivalSettingsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept ticketing settings', () => {
      const result = festivalSettingsSchema.safeParse({
        ticketing: {
          maxTicketsPerOrder: 5,
          cartExpirationMinutes: 30,
          allowTransfers: true,
          allowRefunds: false,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should provide ticketing defaults', () => {
      const result = festivalSettingsSchema.safeParse({
        ticketing: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ticketing?.maxTicketsPerOrder).toBe(10);
        expect(result.data.ticketing?.cartExpirationMinutes).toBe(15);
      }
    });

    it('should reject maxTicketsPerOrder > 20', () => {
      const result = festivalSettingsSchema.safeParse({
        ticketing: { maxTicketsPerOrder: 25 },
      });
      expect(result.success).toBe(false);
    });

    it('should accept cashless settings', () => {
      const result = festivalSettingsSchema.safeParse({
        cashless: {
          enabled: true,
          minTopup: 10,
          maxTopup: 100,
          maxBalance: 300,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept notification settings', () => {
      const result = festivalSettingsSchema.safeParse({
        notifications: {
          emailReminders: true,
          reminderDaysBefore: [7, 3, 1],
          pushNotifications: true,
          smsNotifications: false,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept access settings', () => {
      const result = festivalSettingsSchema.safeParse({
        access: {
          scanMode: 'both',
          allowReentry: true,
          maxReentries: 3,
          noReentryAfterTime: '23:00',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid scanMode', () => {
      const result = festivalSettingsSchema.safeParse({
        access: { scanMode: 'invalid' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid noReentryAfterTime format', () => {
      const result = festivalSettingsSchema.safeParse({
        access: { noReentryAfterTime: '2500' },
      });
      expect(result.success).toBe(false);
    });

    it('should accept legal settings', () => {
      const result = festivalSettingsSchema.safeParse({
        legal: {
          termsUrl: 'https://example.com/terms',
          privacyUrl: 'https://example.com/privacy',
          ageVerificationRequired: true,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Festival Stats Query Schema
  // ============================================================================

  describe('festivalStatsQuerySchema', () => {
    it('should accept valid stats query', () => {
      const result = festivalStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should default granularity to day', () => {
      const result = festivalStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granularity).toBe('day');
      }
    });

    it('should accept date range', () => {
      const result = festivalStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-07-01',
        endDate: '2025-07-31',
      });
      expect(result.success).toBe(true);
    });

    it('should accept granularity options', () => {
      const granularities = ['hour', 'day', 'week', 'month'];
      granularities.forEach((granularity) => {
        const result = festivalStatsQuerySchema.safeParse({
          festivalId: '550e8400-e29b-41d4-a716-446655440000',
          granularity,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept metrics array', () => {
      const result = festivalStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        metrics: ['tickets_sold', 'revenue', 'attendance'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid metric', () => {
      const result = festivalStatsQuerySchema.safeParse({
        festivalId: '550e8400-e29b-41d4-a716-446655440000',
        metrics: ['invalid_metric'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid festivalId', () => {
      const result = festivalStatsQuerySchema.safeParse({ festivalId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle special characters in festival name', () => {
      const result = createFestivalSchema.safeParse({
        name: "Festival D'ete & Rock'n'Roll",
        startDate: '2025-07-15',
        endDate: '2025-07-17',
        timezone: 'Europe/Paris',
        venue: {
          name: 'Venue',
          address: { street: 'Rue', city: 'Paris', postalCode: '75001', country: 'FR' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in description', () => {
      const result = createFestivalSchema.safeParse({
        name: 'Unicode Festival',
        description: 'Welcome to the festival! Enjoy music and fun!',
        startDate: '2025-07-15',
        endDate: '2025-07-17',
        timezone: 'Europe/Paris',
        venue: {
          name: 'Venue',
          address: { street: 'Rue', city: 'Paris', postalCode: '75001', country: 'FR' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from festival name', () => {
      const result = createFestivalSchema.safeParse({
        name: '   Festival Name   ',
        startDate: '2025-07-15',
        endDate: '2025-07-17',
        timezone: 'Europe/Paris',
        venue: {
          name: 'Venue',
          address: { street: 'Rue', city: 'Paris', postalCode: '75001', country: 'FR' },
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Festival Name');
      }
    });
  });
});
