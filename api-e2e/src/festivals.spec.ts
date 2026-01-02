/**
 * Festivals E2E Tests
 *
 * Tests the complete festival management flow:
 * - CRUD operations
 * - Permission testing (organizer vs user)
 * - Publication workflow
 * - Statistics
 */

import {
  api,
  createAuthenticatedUser,
  authenticatedRequest,
  generateFestivalData,
  createFestival,
  publishFestival,
  UserRole,
  FestivalStatus,
  expectSuccess,
  expectError,
} from './support/test-helpers';

describe('Festivals E2E Tests', () => {
  // ============================================
  // Festival Creation Tests
  // ============================================
  describe('POST /festivals', () => {
    it('should create a festival as organizer', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const festivalData = generateFestivalData();

      const response = await authenticatedRequest(
        'post',
        '/festivals',
        organizer.tokens.accessToken,
        festivalData
      );

      expect(response.status).toBe(201);
      const data = response.data.data || response.data;
      expect(data.name).toBe(festivalData.name);
      expect(data.slug).toBe(festivalData.slug);
      expect(data.location).toBe(festivalData.location);
      expect(data.status).toBe(FestivalStatus.DRAFT);
      expect(data.id).toBeDefined();
    });

    it('should reject festival creation for regular users', async () => {
      const user = await createAuthenticatedUser({ role: UserRole.USER });
      const festivalData = generateFestivalData();

      const response = await authenticatedRequest(
        'post',
        '/festivals',
        user.tokens.accessToken,
        festivalData
      );

      expect(response.status).toBe(403);
    });

    it('should reject festival creation without authentication', async () => {
      const festivalData = generateFestivalData();

      const response = await api.post('/festivals', festivalData);

      expect(response.status).toBe(401);
    });

    it('should reject festival with duplicate slug', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const festivalData = generateFestivalData();

      // Create first festival
      await authenticatedRequest(
        'post',
        '/festivals',
        organizer.tokens.accessToken,
        festivalData
      );

      // Try to create another with same slug
      const response = await authenticatedRequest(
        'post',
        '/festivals',
        organizer.tokens.accessToken,
        { ...festivalData, name: 'Different Name' }
      );

      expect(response.status).toBe(409);
    });

    it('should validate required fields', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });

      const response = await authenticatedRequest(
        'post',
        '/festivals',
        organizer.tokens.accessToken,
        {
          // Missing required fields
          name: 'Test Festival',
        }
      );

      expect(response.status).toBe(400);
    });

    it('should validate date range (end date after start date)', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const festivalData = generateFestivalData();

      // Swap dates so end is before start
      const response = await authenticatedRequest(
        'post',
        '/festivals',
        organizer.tokens.accessToken,
        {
          ...festivalData,
          startDate: festivalData.endDate,
          endDate: festivalData.startDate,
        }
      );

      expect([400, 422]).toContain(response.status);
    });
  });

  // ============================================
  // Festival Reading Tests
  // ============================================
  describe('GET /festivals', () => {
    it('should list published festivals for public access', async () => {
      const response = await api.get('/festivals');

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(Array.isArray(data.festivals || data)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await api.get('/festivals?page=1&limit=10');

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.meta || data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await api.get('/festivals?status=PUBLISHED');

      expect(response.status).toBe(200);
    });

    it('should search by name', async () => {
      const response = await api.get('/festivals?search=rock');

      expect(response.status).toBe(200);
    });

    it('should show organizer their draft festivals', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });

      // Create a draft festival
      await createFestival(organizer.tokens.accessToken);

      // Fetch festivals as organizer
      const response = await authenticatedRequest(
        'get',
        '/festivals?myFestivals=true',
        organizer.tokens.accessToken
      );

      expect(response.status).toBe(200);
    });
  });

  describe('GET /festivals/:id', () => {
    it('should get festival details by ID', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      // Publish the festival so it's publicly visible
      await publishFestival(organizer.tokens.accessToken, festival.id);

      const response = await api.get(`/festivals/${festival.id}`);

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.id).toBe(festival.id);
      expect(data.name).toBe(festival.name);
    });

    it('should return 404 for non-existent festival', async () => {
      const response = await api.get(
        '/festivals/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status).toBe(404);
    });

    it('should hide draft festivals from public', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      // Try to access draft festival without authentication
      const response = await api.get(`/festivals/${festival.id}`);

      // Should either return 404 or 403
      expect([403, 404]).toContain(response.status);
    });

    it('should show draft festival to its organizer', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'get',
        `/festivals/${festival.id}`,
        organizer.tokens.accessToken
      );

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.id).toBe(festival.id);
    });
  });

  describe('GET /festivals/slug/:slug', () => {
    it('should get festival by slug', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      // Publish the festival
      await publishFestival(organizer.tokens.accessToken, festival.id);

      const response = await api.get(`/festivals/slug/${festival.slug}`);

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.slug).toBe(festival.slug);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await api.get('/festivals/slug/non-existent-slug');

      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // Festival Update Tests
  // ============================================
  describe('PATCH /festivals/:id', () => {
    it('should update festival as owner', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const updatedName = 'Updated Festival Name';
      const response = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}`,
        organizer.tokens.accessToken,
        { name: updatedName }
      );

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.name).toBe(updatedName);
    });

    it('should reject update from non-owner', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const otherOrganizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}`,
        otherOrganizer.tokens.accessToken,
        { name: 'Hacked Name' }
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to update any festival', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const admin = await createAuthenticatedUser({ role: UserRole.ADMIN });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const updatedDescription = 'Admin updated description';
      const response = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}`,
        admin.tokens.accessToken,
        { description: updatedDescription }
      );

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.description).toBe(updatedDescription);
    });

    it('should reject slug change to existing slug', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival: festival1 } = await createFestival(
        organizer.tokens.accessToken
      );
      const { festival: festival2 } = await createFestival(
        organizer.tokens.accessToken
      );

      const response = await authenticatedRequest(
        'patch',
        `/festivals/${festival2.id}`,
        organizer.tokens.accessToken,
        { slug: festival1.slug }
      );

      expect(response.status).toBe(409);
    });

    it('should validate update data', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}`,
        organizer.tokens.accessToken,
        { maxCapacity: -100 } // Invalid value
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Festival Deletion Tests
  // ============================================
  describe('DELETE /festivals/:id', () => {
    it('should delete festival as admin', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const admin = await createAuthenticatedUser({ role: UserRole.ADMIN });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'delete',
        `/festivals/${festival.id}`,
        admin.tokens.accessToken
      );

      expect(response.status).toBe(204);

      // Verify festival is deleted (soft delete)
      const getResponse = await api.get(`/festivals/${festival.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should reject deletion by organizer', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'delete',
        `/festivals/${festival.id}`,
        organizer.tokens.accessToken
      );

      expect(response.status).toBe(403);
    });

    it('should reject deletion by regular user', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const user = await createAuthenticatedUser({ role: UserRole.USER });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'delete',
        `/festivals/${festival.id}`,
        user.tokens.accessToken
      );

      expect(response.status).toBe(403);
    });
  });

  // ============================================
  // Publication Flow Tests
  // ============================================
  describe('Festival Publication Flow', () => {
    describe('POST /festivals/:id/publish', () => {
      it('should publish draft festival', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/publish`,
          organizer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.status).toBe(FestivalStatus.PUBLISHED);
      });

      it('should reject publishing non-draft festival', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        // Publish first
        await publishFestival(organizer.tokens.accessToken, festival.id);

        // Try to publish again
        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/publish`,
          organizer.tokens.accessToken
        );

        expect(response.status).toBe(400);
      });

      it('should reject publish by non-owner', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const otherOrganizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/publish`,
          otherOrganizer.tokens.accessToken
        );

        expect(response.status).toBe(403);
      });
    });

    describe('PATCH /festivals/:id/status', () => {
      it('should change festival status', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        // First publish
        await publishFestival(organizer.tokens.accessToken, festival.id);

        // Then set to ongoing
        const response = await authenticatedRequest(
          'patch',
          `/festivals/${festival.id}/status`,
          organizer.tokens.accessToken,
          { status: FestivalStatus.ONGOING }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.status).toBe(FestivalStatus.ONGOING);
      });

      it('should validate status transitions', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        // Try invalid transition: DRAFT -> COMPLETED
        const response = await authenticatedRequest(
          'patch',
          `/festivals/${festival.id}/status`,
          organizer.tokens.accessToken,
          { status: FestivalStatus.COMPLETED }
        );

        expect(response.status).toBe(400);
      });

      it('should allow cancelling at any status', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'patch',
          `/festivals/${festival.id}/status`,
          organizer.tokens.accessToken,
          { status: FestivalStatus.CANCELLED }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.status).toBe(FestivalStatus.CANCELLED);
      });
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================
  describe('GET /festivals/:id/stats', () => {
    it('should return statistics to owner', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'get',
        `/festivals/${festival.id}/stats`,
        organizer.tokens.accessToken
      );

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data).toHaveProperty('ticketStats');
      expect(data).toHaveProperty('revenue');
    });

    it('should reject statistics request from non-owner', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const user = await createAuthenticatedUser({ role: UserRole.USER });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'get',
        `/festivals/${festival.id}/stats`,
        user.tokens.accessToken
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin to view any festival stats', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });
      const admin = await createAuthenticatedUser({ role: UserRole.ADMIN });
      const { festival } = await createFestival(organizer.tokens.accessToken);

      const response = await authenticatedRequest(
        'get',
        `/festivals/${festival.id}/stats`,
        admin.tokens.accessToken
      );

      expect(response.status).toBe(200);
    });
  });

  // ============================================
  // Complete Festival Lifecycle Test
  // ============================================
  describe('Complete Festival Lifecycle', () => {
    it('should complete create -> publish -> update -> complete flow', async () => {
      const organizer = await createAuthenticatedUser({
        role: UserRole.ORGANIZER,
      });

      // Step 1: Create festival
      const { festival } = await createFestival(organizer.tokens.accessToken);
      expect(festival.status).toBe(FestivalStatus.DRAFT);

      // Step 2: Publish festival
      const publishResponse = await publishFestival(
        organizer.tokens.accessToken,
        festival.id
      );
      expect(publishResponse.status).toBe(200);
      const publishData = publishResponse.data.data || publishResponse.data;
      expect(publishData.status).toBe(FestivalStatus.PUBLISHED);

      // Step 3: Update to ongoing
      const ongoingResponse = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}/status`,
        organizer.tokens.accessToken,
        { status: FestivalStatus.ONGOING }
      );
      expect(ongoingResponse.status).toBe(200);

      // Step 4: Complete festival
      const completeResponse = await authenticatedRequest(
        'patch',
        `/festivals/${festival.id}/status`,
        organizer.tokens.accessToken,
        { status: FestivalStatus.COMPLETED }
      );
      expect(completeResponse.status).toBe(200);
      const completeData = completeResponse.data.data || completeResponse.data;
      expect(completeData.status).toBe(FestivalStatus.COMPLETED);

      // Step 5: Verify festival is visible publicly
      const publicResponse = await api.get(`/festivals/${festival.id}`);
      expect(publicResponse.status).toBe(200);
    });
  });
});
