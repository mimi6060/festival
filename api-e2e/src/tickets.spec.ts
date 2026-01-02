/**
 * Tickets E2E Tests
 *
 * Tests the complete ticket flow:
 * - Ticket category management
 * - Purchase flow
 * - QR code validation
 * - Cancellation and refund
 */

import {
  api,
  createAuthenticatedUser,
  authenticatedRequest,
  createFestival,
  publishFestival,
  createTicketCategory,
  UserRole,
  FestivalStatus,
  sleep,
} from './support/test-helpers';
import { v4 as uuidv4 } from 'uuid';

describe('Tickets E2E Tests', () => {
  // ============================================
  // Test Data Setup Helpers
  // ============================================

  async function setupFestivalWithCategory() {
    const organizer = await createAuthenticatedUser({
      role: UserRole.ORGANIZER,
    });
    const { festival } = await createFestival(organizer.tokens.accessToken);
    await publishFestival(organizer.tokens.accessToken, festival.id);

    const { category } = await createTicketCategory(
      organizer.tokens.accessToken,
      festival.id,
      {
        name: 'Standard Ticket',
        type: 'STANDARD',
        price: 50,
        quota: 100,
      }
    );

    return { organizer, festival, category };
  }

  // ============================================
  // Ticket Category Tests
  // ============================================
  describe('Ticket Categories', () => {
    describe('POST /festivals/:festivalId/ticket-categories', () => {
      it('should create ticket category as organizer', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const saleStartDate = new Date();
        const saleEndDate = new Date();
        saleEndDate.setDate(saleEndDate.getDate() + 25);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/ticket-categories`,
          organizer.tokens.accessToken,
          {
            name: 'VIP Pass',
            description: 'VIP access with backstage',
            type: 'VIP',
            price: 150.0,
            quota: 50,
            maxPerUser: 2,
            saleStartDate: saleStartDate.toISOString(),
            saleEndDate: saleEndDate.toISOString(),
          }
        );

        expect(response.status).toBe(201);
        const data = response.data.data || response.data;
        expect(data.name).toBe('VIP Pass');
        expect(Number(data.price)).toBe(150);
        expect(data.quota).toBe(50);
        expect(data.type).toBe('VIP');
      });

      it('should reject category creation by non-owner', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const otherOrganizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/ticket-categories`,
          otherOrganizer.tokens.accessToken,
          {
            name: 'Hacked Category',
            type: 'STANDARD',
            price: 10,
            quota: 1000,
            saleStartDate: new Date().toISOString(),
            saleEndDate: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          }
        );

        expect(response.status).toBe(403);
      });

      it('should validate price is positive', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/ticket-categories`,
          organizer.tokens.accessToken,
          {
            name: 'Invalid Category',
            type: 'STANDARD',
            price: -50,
            quota: 100,
            saleStartDate: new Date().toISOString(),
            saleEndDate: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          }
        );

        expect(response.status).toBe(400);
      });

      it('should validate quota is positive', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);

        const response = await authenticatedRequest(
          'post',
          `/festivals/${festival.id}/ticket-categories`,
          organizer.tokens.accessToken,
          {
            name: 'Invalid Category',
            type: 'STANDARD',
            price: 50,
            quota: 0,
            saleStartDate: new Date().toISOString(),
            saleEndDate: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          }
        );

        expect(response.status).toBe(400);
      });
    });

    describe('GET /festivals/:festivalId/ticket-categories', () => {
      it('should list ticket categories', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();

        const response = await api.get(
          `/festivals/${festival.id}/ticket-categories`
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });

      it('should show availability info', async () => {
        const { festival } = await setupFestivalWithCategory();

        const response = await api.get(
          `/festivals/${festival.id}/ticket-categories`
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const category = data[0];
        expect(category).toHaveProperty('quota');
        expect(category).toHaveProperty('soldCount');
      });
    });

    describe('PATCH /festivals/:festivalId/ticket-categories/:categoryId', () => {
      it('should update category as owner', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();

        const response = await authenticatedRequest(
          'patch',
          `/festivals/${festival.id}/ticket-categories/${category.id}`,
          organizer.tokens.accessToken,
          { price: 75 }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(Number(data.price)).toBe(75);
      });

      it('should reject update by non-owner', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'patch',
          `/festivals/${festival.id}/ticket-categories/${category.id}`,
          user.tokens.accessToken,
          { price: 1 }
        );

        expect(response.status).toBe(403);
      });
    });
  });

  // ============================================
  // Ticket Purchase Tests
  // ============================================
  describe('Ticket Purchase', () => {
    describe('POST /tickets/purchase', () => {
      it('should purchase tickets successfully', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 2,
          }
        );

        expect(response.status).toBe(201);
        const data = response.data.data || response.data;
        expect(data.tickets).toBeDefined();
        expect(data.tickets.length).toBe(2);
        expect(data.payment).toBeDefined();
        expect(data.totalAmount).toBe(100); // 2 * 50
      });

      it('should generate unique QR codes for each ticket', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 3,
          }
        );

        expect(response.status).toBe(201);
        const data = response.data.data || response.data;
        const qrCodes = data.tickets.map((t: any) => t.qrCode);
        const uniqueQrCodes = new Set(qrCodes);
        expect(uniqueQrCodes.size).toBe(3);
      });

      it('should reject purchase without authentication', async () => {
        const { festival, category } = await setupFestivalWithCategory();

        const response = await api.post('/tickets/purchase', {
          festivalId: festival.id,
          categoryId: category.id,
          quantity: 1,
        });

        expect(response.status).toBe(401);
      });

      it('should enforce max tickets per user', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);
        await publishFestival(organizer.tokens.accessToken, festival.id);

        // Create category with maxPerUser = 2
        const { category } = await createTicketCategory(
          organizer.tokens.accessToken,
          festival.id,
          {
            name: 'Limited Ticket',
            type: 'STANDARD',
            price: 50,
            quota: 100,
          }
        );

        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Try to buy more than allowed
        const response = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 10, // Exceeds maxPerUser
          }
        );

        expect([400, 422]).toContain(response.status);
      });

      it('should reject purchase for sold out category', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);
        await publishFestival(organizer.tokens.accessToken, festival.id);

        // Create category with very limited quota
        const { category } = await createTicketCategory(
          organizer.tokens.accessToken,
          festival.id,
          {
            name: 'Limited Ticket',
            type: 'STANDARD',
            price: 50,
            quota: 1,
          }
        );

        const buyer1 = await createAuthenticatedUser({ role: UserRole.USER });
        const buyer2 = await createAuthenticatedUser({ role: UserRole.USER });

        // First buyer takes the only ticket
        await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer1.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );

        // Second buyer should fail
        const response = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer2.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );

        expect([400, 409, 422]).toContain(response.status);
      });

      it('should reject purchase for unpublished festival', async () => {
        const organizer = await createAuthenticatedUser({
          role: UserRole.ORGANIZER,
        });
        const { festival } = await createFestival(organizer.tokens.accessToken);
        // NOT publishing the festival
        const { category } = await createTicketCategory(
          organizer.tokens.accessToken,
          festival.id
        );

        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );

        expect([400, 403, 404]).toContain(response.status);
      });
    });

    describe('GET /tickets/me', () => {
      it('should return user tickets', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase tickets
        await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 2,
          }
        );

        // Get my tickets
        const response = await authenticatedRequest(
          'get',
          '/tickets/me',
          buyer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(2);
      });

      it('should return empty array for user with no tickets', async () => {
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'get',
          '/tickets/me',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      });
    });

    describe('GET /tickets/:id', () => {
      it('should return ticket details to owner', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Get ticket details
        const response = await authenticatedRequest(
          'get',
          `/tickets/${ticketId}`,
          buyer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.id).toBe(ticketId);
        expect(data.qrCode).toBeDefined();
        expect(data.status).toBe('SOLD');
      });

      it('should reject ticket access by non-owner', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const other = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Try to access as different user
        const response = await authenticatedRequest(
          'get',
          `/tickets/${ticketId}`,
          other.tokens.accessToken
        );

        expect(response.status).toBe(403);
      });

      it('should allow staff to view ticket details', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Staff should be able to view
        const response = await authenticatedRequest(
          'get',
          `/tickets/${ticketId}`,
          staff.tokens.accessToken
        );

        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================
  // QR Code Validation Tests
  // ============================================
  describe('QR Code Validation', () => {
    describe('POST /tickets/:id/validate', () => {
      it('should validate ticket successfully as staff', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticket = purchaseResponse.data.data.tickets[0];

        // Validate ticket
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          staff.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(response.data.success).toBe(true);
        expect(data.status).toBe('USED');
      });

      it('should reject validation by regular user', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticket = purchaseResponse.data.data.tickets[0];

        // Try to validate as regular user
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          buyer.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        expect(response.status).toBe(403);
      });

      it('should reject already used ticket', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticket = purchaseResponse.data.data.tickets[0];

        // First validation
        await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          staff.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        // Second validation - should fail
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          staff.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        expect(response.data.success).toBe(false);
        expect(response.data.message).toContain('already');
      });

      it('should reject invalid QR code', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Validate with wrong QR code
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/validate`,
          staff.tokens.accessToken,
          { qrCode: 'invalid-qr-code-12345' }
        );

        expect(response.data.success).toBe(false);
      });

      it('should allow security personnel to validate', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const security = await createAuthenticatedUser({
          role: UserRole.SECURITY,
        });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticket = purchaseResponse.data.data.tickets[0];

        // Validate as security
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          security.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
      });
    });
  });

  // ============================================
  // Cancellation and Refund Tests
  // ============================================
  describe('Ticket Cancellation', () => {
    describe('POST /tickets/:id/cancel', () => {
      it('should cancel ticket and initiate refund', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Cancel ticket
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/cancel`,
          buyer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.ticket.status).toBe('CANCELLED');
        expect(data.refund).toBeDefined();
        expect(data.refund.amount).toBeGreaterThanOrEqual(0);
      });

      it('should reject cancellation by non-owner', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const other = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Try to cancel as different user
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/cancel`,
          other.tokens.accessToken
        );

        expect(response.status).toBe(403);
      });

      it('should reject cancellation of used ticket', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticket = purchaseResponse.data.data.tickets[0];

        // Use the ticket
        await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/validate`,
          staff.tokens.accessToken,
          { qrCode: ticket.qrCode }
        );

        // Try to cancel used ticket
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticket.id}/cancel`,
          buyer.tokens.accessToken
        );

        expect([400, 409]).toContain(response.status);
      });

      it('should reject double cancellation', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // First cancellation
        await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/cancel`,
          buyer.tokens.accessToken
        );

        // Second cancellation - should fail
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/cancel`,
          buyer.tokens.accessToken
        );

        expect([400, 409]).toContain(response.status);
      });

      it('should allow admin to cancel any ticket', async () => {
        const { festival, category } = await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });
        const admin = await createAuthenticatedUser({ role: UserRole.ADMIN });

        // Purchase ticket
        const purchaseResponse = await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 1,
          }
        );
        const ticketId = purchaseResponse.data.data.tickets[0].id;

        // Admin cancels ticket
        const response = await authenticatedRequest(
          'post',
          `/tickets/${ticketId}/cancel`,
          admin.tokens.accessToken
        );

        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================
  // Festival Ticket Stats Tests
  // ============================================
  describe('Festival Ticket Statistics', () => {
    describe('GET /festivals/:festivalId/tickets', () => {
      it('should list all tickets for organizer', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();
        const buyer = await createAuthenticatedUser({ role: UserRole.USER });

        // Purchase tickets
        await authenticatedRequest(
          'post',
          '/tickets/purchase',
          buyer.tokens.accessToken,
          {
            festivalId: festival.id,
            categoryId: category.id,
            quantity: 3,
          }
        );

        // Get festival tickets
        const response = await authenticatedRequest(
          'get',
          `/festivals/${festival.id}/tickets`,
          organizer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(3);
      });

      it('should reject access by regular user', async () => {
        const { festival } = await setupFestivalWithCategory();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'get',
          `/festivals/${festival.id}/tickets`,
          user.tokens.accessToken
        );

        expect(response.status).toBe(403);
      });
    });

    describe('GET /festivals/:festivalId/tickets/stats', () => {
      it('should return ticket statistics', async () => {
        const { organizer, festival, category } =
          await setupFestivalWithCategory();

        const response = await authenticatedRequest(
          'get',
          `/festivals/${festival.id}/tickets/stats`,
          organizer.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data).toHaveProperty('totalSold');
        expect(data).toHaveProperty('totalRevenue');
        expect(data).toHaveProperty('byCategory');
      });
    });
  });

  // ============================================
  // Complete Ticket Flow Test
  // ============================================
  describe('Complete Ticket Flow', () => {
    it('should complete purchase -> validate -> stats flow', async () => {
      // Step 1: Setup festival and category
      const { organizer, festival, category } =
        await setupFestivalWithCategory();
      const buyer = await createAuthenticatedUser({ role: UserRole.USER });
      const staff = await createAuthenticatedUser({ role: UserRole.STAFF });

      // Step 2: Purchase tickets
      const purchaseResponse = await authenticatedRequest(
        'post',
        '/tickets/purchase',
        buyer.tokens.accessToken,
        {
          festivalId: festival.id,
          categoryId: category.id,
          quantity: 2,
        }
      );
      expect(purchaseResponse.status).toBe(201);
      const tickets = purchaseResponse.data.data.tickets;
      expect(tickets.length).toBe(2);

      // Step 3: View my tickets
      const myTicketsResponse = await authenticatedRequest(
        'get',
        '/tickets/me',
        buyer.tokens.accessToken
      );
      expect(myTicketsResponse.status).toBe(200);
      const myTickets = myTicketsResponse.data.data || myTicketsResponse.data;
      expect(myTickets.length).toBe(2);

      // Step 4: Validate first ticket
      const validateResponse = await authenticatedRequest(
        'post',
        `/tickets/${tickets[0].id}/validate`,
        staff.tokens.accessToken,
        { qrCode: tickets[0].qrCode }
      );
      expect(validateResponse.status).toBe(200);
      expect(validateResponse.data.success).toBe(true);

      // Step 5: Check ticket status
      const ticketDetailResponse = await authenticatedRequest(
        'get',
        `/tickets/${tickets[0].id}`,
        buyer.tokens.accessToken
      );
      expect(ticketDetailResponse.status).toBe(200);
      const ticketDetail =
        ticketDetailResponse.data.data || ticketDetailResponse.data;
      expect(ticketDetail.status).toBe('USED');

      // Step 6: Cancel second ticket
      const cancelResponse = await authenticatedRequest(
        'post',
        `/tickets/${tickets[1].id}/cancel`,
        buyer.tokens.accessToken
      );
      expect(cancelResponse.status).toBe(200);
      const cancelData = cancelResponse.data.data || cancelResponse.data;
      expect(cancelData.ticket.status).toBe('CANCELLED');

      // Step 7: Check festival stats
      const statsResponse = await authenticatedRequest(
        'get',
        `/festivals/${festival.id}/tickets/stats`,
        organizer.tokens.accessToken
      );
      expect(statsResponse.status).toBe(200);
    });
  });
});
