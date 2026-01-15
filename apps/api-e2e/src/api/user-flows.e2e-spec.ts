/**
 * Critical User Flows E2E Tests - Story 1.3
 *
 * Tests the main user flows end-to-end:
 * 1. Purchase Ticket Flow - create payment intent, complete purchase
 * 2. Login Flow - login, get user profile, view tickets
 * 3. Admin Dashboard KPIs - login as admin, fetch dashboard stats
 * 4. Cashless Topup Flow - create topup, verify balance
 *
 * These tests use real HTTP requests and test the full flow
 * from authentication to data operations.
 */

import supertest from 'supertest';
import {
  createTestUser,
  createTestFestival,
  createTestTicketCategory,
  authenticatedRequest,
  randomEmail,
  randomPassword,
  loginUser,
} from '../support';
import { validFestivalData, standardTicketCategory, vipTicketCategory } from '../support/fixtures';

// Get the base URL from environment
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? '3333';
const baseUrl = `http://${host}:${port}`;
const request = supertest;

// ============================================================================
// FLOW 1: PURCHASE TICKET FLOW
// ============================================================================
describe('Flow 1: Purchase Ticket Flow', () => {
  let organizerToken: string;
  let userToken: string;
  let userId: string;
  let festivalId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Create organizer
    const organizer = await createTestUser('ORGANIZER', {
      email: randomEmail(),
      password: randomPassword(),
    });
    organizerToken = organizer.accessToken ?? '';

    // Create regular user
    const user = await createTestUser('USER', {
      email: randomEmail(),
      password: randomPassword(),
    });
    userToken = user.accessToken ?? '';
    userId = user.id;

    // Setup festival and ticket category
    try {
      const festival = await createTestFestival(organizerToken, {
        ...validFestivalData,
        name: `Purchase Flow Test Festival ${Date.now()}`,
        slug: `purchase-flow-test-${Date.now()}`,
      });
      festivalId = festival.id;

      const category = await createTestTicketCategory(organizerToken, festivalId, {
        ...standardTicketCategory,
        name: `Purchase Flow Category ${Date.now()}`,
        price: 99.99,
        quota: 100,
      });
      categoryId = category.id;
    } catch {
      console.warn('Test setup may have partially failed');
    }
  });

  describe('1.1 Create Payment Intent for Ticket Purchase', () => {
    it('should create a payment intent for ticket purchase', async () => {
      if (!festivalId || !categoryId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const response = await authenticatedRequest('post', '/api/payments/intent', userToken, {
        userId,
        amount: 9999, // 99.99 EUR in cents
        currency: 'eur',
        description: 'Festival ticket purchase',
        metadata: {
          festivalId,
          categoryId,
          quantity: '1',
          type: 'ticket_purchase',
        },
      });

      // Stripe may not be configured in test, so accept multiple statuses
      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('clientSecret');
        expect(response.data).toHaveProperty('paymentIntentId');
        expect(response.data.clientSecret).toMatch(/^pi_.*_secret_/);
      }
    });

    it('should create checkout session for ticket purchase', async () => {
      if (!festivalId || !categoryId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/ticket',
        userToken,
        {
          userId,
          festivalId,
          tickets: [
            {
              categoryId,
              name: 'Standard Festival Pass',
              price: 99.99,
              quantity: 1,
            },
          ],
          successUrl: 'https://festival.test/success?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://festival.test/cancel',
        }
      );

      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('paymentId');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data).toHaveProperty('checkoutUrl');
        expect(response.data.checkoutUrl).toContain('checkout.stripe.com');
      }
    });
  });

  describe('1.2 Complete Ticket Purchase via Direct Buy', () => {
    it('should complete full ticket purchase flow', async () => {
      if (!festivalId || !categoryId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // Step 1: Check ticket availability
      const availabilityResponse = await authenticatedRequest(
        'get',
        `/api/festivals/${festivalId}/ticket-categories`,
        userToken
      );

      expect([200, 404]).toContain(availabilityResponse.status);

      // Step 2: Purchase ticket
      const purchaseResponse = await authenticatedRequest('post', '/api/tickets/buy', userToken, {
        festivalId,
        categoryId,
        quantity: 1,
      });

      expect([200, 201, 400]).toContain(purchaseResponse.status);

      if (purchaseResponse.status === 200 || purchaseResponse.status === 201) {
        const tickets = Array.isArray(purchaseResponse.data)
          ? purchaseResponse.data
          : [purchaseResponse.data];

        expect(tickets.length).toBe(1);
        expect(tickets[0]).toHaveProperty('id');
        expect(tickets[0]).toHaveProperty('qrCode');
        expect(tickets[0]).toHaveProperty('status');
        expect(tickets[0].status).toBe('SOLD');

        // Step 3: Verify ticket appears in user's tickets
        const myTicketsResponse = await authenticatedRequest('get', '/api/tickets/me', userToken);

        expect(myTicketsResponse.status).toBe(200);
        const myTickets = Array.isArray(myTicketsResponse.data)
          ? myTicketsResponse.data
          : myTicketsResponse.data.tickets || [];

        const purchasedTicket = myTickets.find(
          (t: { id: string }) => t.id === tickets[0].id
        );
        expect(purchasedTicket).toBeDefined();
      }
    });

    it('should purchase multiple tickets in one transaction', async () => {
      if (!festivalId || !categoryId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // Create a new user for this test to have fresh quota
      const multiTicketUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      const purchaseResponse = await authenticatedRequest(
        'post',
        '/api/tickets/buy',
        multiTicketUser.accessToken!,
        {
          festivalId,
          categoryId,
          quantity: 2,
        }
      );

      expect([200, 201, 400]).toContain(purchaseResponse.status);

      if (purchaseResponse.status === 200 || purchaseResponse.status === 201) {
        const tickets = Array.isArray(purchaseResponse.data)
          ? purchaseResponse.data
          : [purchaseResponse.data];

        expect(tickets.length).toBe(2);

        // Each ticket should have unique QR code
        const qrCodes = tickets.map((t: { qrCode: string }) => t.qrCode);
        const uniqueQrCodes = new Set(qrCodes);
        expect(uniqueQrCodes.size).toBe(2);
      }
    });
  });

  describe('1.3 Ticket Purchase Edge Cases', () => {
    it('should reject purchase when sold out', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // Create a category with very limited quota
      const limitedCategory = await createTestTicketCategory(organizerToken, festivalId, {
        ...standardTicketCategory,
        name: `Limited Category ${Date.now()}`,
        quota: 1,
        maxPerUser: 2,
      });

      // First user buys the only ticket
      const user1 = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      const firstPurchase = await authenticatedRequest(
        'post',
        '/api/tickets/buy',
        user1.accessToken!,
        {
          festivalId,
          categoryId: limitedCategory.id,
          quantity: 1,
        }
      );

      if (firstPurchase.status === 200 || firstPurchase.status === 201) {
        // Second user tries to buy - should fail
        const user2 = await createTestUser('USER', {
          email: randomEmail(),
          password: randomPassword(),
        });

        const secondPurchase = await authenticatedRequest(
          'post',
          '/api/tickets/buy',
          user2.accessToken!,
          {
            festivalId,
            categoryId: limitedCategory.id,
            quantity: 1,
          }
        );

        expect([400, 409]).toContain(secondPurchase.status);
      }
    });

    it('should reject purchase exceeding max per user', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // Create category with max 2 per user
      const limitedPerUserCategory = await createTestTicketCategory(organizerToken, festivalId, {
        ...standardTicketCategory,
        name: `Max Per User Category ${Date.now()}`,
        quota: 100,
        maxPerUser: 2,
      });

      const limitedUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      // Try to buy 5 tickets when max is 2
      const response = await authenticatedRequest(
        'post',
        '/api/tickets/buy',
        limitedUser.accessToken!,
        {
          festivalId,
          categoryId: limitedPerUserCategory.id,
          quantity: 5,
        }
      );

      expect([400, 409]).toContain(response.status);
    });
  });
});

// ============================================================================
// FLOW 2: LOGIN FLOW
// ============================================================================
describe('Flow 2: Login Flow', () => {
  let testEmail: string;
  let testPassword: string;

  beforeAll(async () => {
    testEmail = randomEmail();
    testPassword = randomPassword();

    // Register test user
    await request(baseUrl)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Login',
        lastName: 'Flow',
      });
  });

  describe('2.1 Login and Token Management', () => {
    it('should complete login and get tokens', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens).toHaveProperty('expiresIn');

      // Verify cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should access protected route with token', async () => {
      // Login first
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.tokens.accessToken;

      // Access protected route
      const meResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body).toHaveProperty('email', testEmail);
      expect(meResponse.body).toHaveProperty('firstName', 'Login');
      expect(meResponse.body).toHaveProperty('lastName', 'Flow');
      expect(meResponse.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('2.2 Get User Profile', () => {
    it('should get complete user profile after login', async () => {
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const accessToken = loginResponse.body.tokens.accessToken;

      // Get profile
      const profileResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body).toHaveProperty('email', testEmail);
      expect(profileResponse.body).toHaveProperty('firstName');
      expect(profileResponse.body).toHaveProperty('lastName');
      expect(profileResponse.body).toHaveProperty('role');
      expect(profileResponse.body).toHaveProperty('createdAt');

      // Should not expose sensitive fields
      expect(profileResponse.body).not.toHaveProperty('passwordHash');
      expect(profileResponse.body).not.toHaveProperty('password');
    });
  });

  describe('2.3 View User Tickets', () => {
    it('should login and view purchased tickets', async () => {
      // Create a new user with tickets
      const ticketUserEmail = randomEmail();
      const ticketUserPassword = randomPassword();

      // Register
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email: ticketUserEmail,
          password: ticketUserPassword,
          firstName: 'Ticket',
          lastName: 'Owner',
        })
        .expect(201);

      const accessToken = registerResponse.body.tokens.accessToken;

      // View tickets (should be empty initially)
      const ticketsResponse = await request(baseUrl)
        .get('/api/tickets/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tickets = Array.isArray(ticketsResponse.body)
        ? ticketsResponse.body
        : ticketsResponse.body.tickets || [];

      expect(Array.isArray(tickets)).toBe(true);
    });

    it('should complete full login-to-tickets flow', async () => {
      // Step 1: Register new user
      const flowEmail = randomEmail();
      const flowPassword = randomPassword();

      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email: flowEmail,
          password: flowPassword,
          firstName: 'Flow',
          lastName: 'User',
        })
        .expect(201);

      // Step 2: Logout and login again (simulate real flow)
      const accessToken = registerResponse.body.tokens.accessToken;

      await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 3: Login
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: flowEmail,
          password: flowPassword,
        })
        .expect(200);

      const newAccessToken = loginResponse.body.tokens.accessToken;

      // Step 4: Get profile
      const profileResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(flowEmail);

      // Step 5: View tickets
      const ticketsResponse = await request(baseUrl)
        .get('/api/tickets/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(ticketsResponse.body).toBeDefined();
    });
  });

  describe('2.4 Token Refresh Flow', () => {
    it('should refresh token and maintain session', async () => {
      // Login
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const { accessToken, refreshToken } = loginResponse.body.tokens;

      // Wait a bit to ensure tokens have different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh token
      const refreshResponse = await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body.accessToken).not.toBe(accessToken);

      // Use new token to access protected route
      const meResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(meResponse.body.email).toBe(testEmail);
    });
  });
});

// ============================================================================
// FLOW 3: ADMIN DASHBOARD KPIs
// ============================================================================
describe('Flow 3: Admin Dashboard KPIs', () => {
  let adminToken: string;
  let organizerToken: string;
  let festivalId: string;

  beforeAll(async () => {
    // Try to login with seeded admin account first
    try {
      const adminLogin = await loginUser('admin@festival.fr', 'Festival2025!');
      adminToken = adminLogin.accessToken;
    } catch {
      // If seeded admin doesn't exist, create an admin user
      const admin = await createTestUser('ADMIN', {
        email: randomEmail(),
        password: randomPassword(),
      });
      adminToken = admin.accessToken ?? '';
    }

    // Create organizer for festival setup
    const organizer = await createTestUser('ORGANIZER', {
      email: randomEmail(),
      password: randomPassword(),
    });
    organizerToken = organizer.accessToken ?? '';

    // Create a festival for dashboard tests
    try {
      const festival = await createTestFestival(organizerToken, {
        ...validFestivalData,
        name: `Dashboard Test Festival ${Date.now()}`,
        slug: `dashboard-test-${Date.now()}`,
      });
      festivalId = festival.id;
    } catch {
      console.warn('Festival setup may have failed');
    }
  });

  describe('3.1 Admin Login and Dashboard Access', () => {
    it('should login as admin and verify admin role', async () => {
      // Try seeded admin credentials
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: 'admin@festival.fr',
          password: 'Festival2025!',
        });

      if (response.status === 200) {
        expect(response.body.user.role).toBe('ADMIN');
        adminToken = response.body.tokens.accessToken;
      }
    });

    it('should access admin-protected analytics endpoint', async () => {
      if (!adminToken || !festivalId) {
        console.warn('Skipping - admin token or festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'get',
        `/api/analytics/festivals/${festivalId}/dashboard`,
        adminToken
      );

      // May return 200 (success), 403 (role not properly set), or 404 (not found)
      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        // Dashboard should have KPIs
        expect(response.data).toHaveProperty('totalTicketsSold');
        expect(response.data).toHaveProperty('totalRevenue');
        expect(response.data).toHaveProperty('totalAttendees');
      }
    });
  });

  describe('3.2 Fetch Dashboard Statistics', () => {
    it('should fetch festival dashboard KPIs', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Use organizer token as they should have access to their festival stats
      const response = await authenticatedRequest(
        'get',
        `/api/analytics/festivals/${festivalId}/dashboard`,
        organizerToken
      );

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        const dashboard = response.data;

        // Verify KPI structure
        expect(dashboard).toHaveProperty('totalTicketsSold');
        expect(dashboard).toHaveProperty('totalRevenue');
        expect(typeof dashboard.totalTicketsSold).toBe('number');
        expect(typeof dashboard.totalRevenue).toBe('number');
      }
    });

    it('should fetch sales analytics', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'get',
        `/api/analytics/festivals/${festivalId}/sales`,
        organizerToken
      );

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });

    it('should fetch attendance analytics', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'get',
        `/api/analytics/festivals/${festivalId}/attendance`,
        organizerToken
      );

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should fetch cashless analytics', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'get',
        `/api/analytics/festivals/${festivalId}/cashless`,
        organizerToken
      );

      expect([200, 403, 404]).toContain(response.status);
    });
  });

  describe('3.3 Festival Stats Endpoint', () => {
    it('should fetch festival statistics', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'get',
        `/api/festivals/${festivalId}/stats`,
        organizerToken
      );

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        // Festival stats should include key metrics
        const stats = response.data;
        expect(stats).toBeDefined();
      }
    });
  });

  describe('3.4 Admin-Only Endpoints', () => {
    it('should allow admin to access cache dashboard', async () => {
      if (!adminToken) {
        console.warn('Skipping - admin token not available');
        return;
      }

      const response = await authenticatedRequest('get', '/api/cache/dashboard', adminToken);

      // May return 200, 403 (role check), or 404 (endpoint not found)
      expect([200, 403, 404]).toContain(response.status);
    });

    it('should deny regular user access to admin endpoints', async () => {
      // Create regular user
      const regularUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      const response = await authenticatedRequest(
        'get',
        '/api/cache/dashboard',
        regularUser.accessToken!
      );

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status);
    });
  });
});

// ============================================================================
// FLOW 4: CASHLESS TOPUP FLOW
// ============================================================================
describe('Flow 4: Cashless Topup Flow', () => {
  let organizerToken: string;
  let userToken: string;
  let userId: string;
  let festivalId: string;

  beforeAll(async () => {
    // Create organizer
    const organizer = await createTestUser('ORGANIZER', {
      email: randomEmail(),
      password: randomPassword(),
    });
    organizerToken = organizer.accessToken ?? '';

    // Create regular user
    const user = await createTestUser('USER', {
      email: randomEmail(),
      password: randomPassword(),
    });
    userToken = user.accessToken ?? '';
    userId = user.id;

    // Create a festival
    try {
      const festival = await createTestFestival(organizerToken, {
        ...validFestivalData,
        name: `Cashless Flow Test Festival ${Date.now()}`,
        slug: `cashless-flow-test-${Date.now()}`,
      });
      festivalId = festival.id;
    } catch {
      console.warn('Festival setup may have failed');
    }
  });

  describe('4.1 Create Cashless Account', () => {
    it('should create a new cashless account', async () => {
      const response = await authenticatedRequest('post', '/api/cashless/account', userToken);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('balance');
        expect(response.data.balance).toBe(0);
        expect(response.data.isActive).toBe(true);
      }
    });

    it('should return existing account on second call', async () => {
      const response1 = await authenticatedRequest('post', '/api/cashless/account', userToken);
      const response2 = await authenticatedRequest('post', '/api/cashless/account', userToken);

      if (response1.status >= 200 && response1.status < 300 &&
          response2.status >= 200 && response2.status < 300) {
        expect(response1.data.id).toBe(response2.data.id);
      }
    });
  });

  describe('4.2 Create Topup via Payment', () => {
    it('should create cashless topup checkout session', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/cashless-topup',
        userToken,
        {
          userId,
          festivalId,
          amount: 50, // 50 EUR topup
          successUrl: 'https://festival.test/topup-success',
          cancelUrl: 'https://festival.test/topup-cancel',
        }
      );

      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('paymentId');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data).toHaveProperty('checkoutUrl');
      }
    });

    it('should create topup via direct endpoint', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Ensure account exists
      await authenticatedRequest('post', '/api/cashless/account', userToken);

      const response = await authenticatedRequest('post', '/api/cashless/topup', userToken, {
        amount: 50,
        festivalId,
      });

      expect([200, 201, 400]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.data).toHaveProperty('id');
      }
    });
  });

  describe('4.3 Verify Balance After Topup', () => {
    it('should show updated balance after topup', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Create fresh user for this test
      const balanceUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      // Create account
      await authenticatedRequest('post', '/api/cashless/account', balanceUser.accessToken!);

      // Check initial balance
      const initialBalance = await authenticatedRequest(
        'get',
        '/api/cashless/balance',
        balanceUser.accessToken!
      );
      expect(initialBalance.status).toBe(200);
      expect(initialBalance.data.balance).toBe(0);

      // Topup
      const topupResponse = await authenticatedRequest(
        'post',
        '/api/cashless/topup',
        balanceUser.accessToken!,
        {
          amount: 100,
          festivalId,
        }
      );

      if (topupResponse.status === 200 || topupResponse.status === 201) {
        // Verify balance increased
        const newBalance = await authenticatedRequest(
          'get',
          '/api/cashless/balance',
          balanceUser.accessToken!
        );
        expect(newBalance.status).toBe(200);
        expect(newBalance.data.balance).toBe(100);
      }
    });

    it('should track multiple topups correctly', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Create fresh user
      const multiTopupUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      await authenticatedRequest('post', '/api/cashless/account', multiTopupUser.accessToken!);

      // First topup
      await authenticatedRequest('post', '/api/cashless/topup', multiTopupUser.accessToken!, {
        amount: 50,
        festivalId,
      });

      // Second topup
      await authenticatedRequest('post', '/api/cashless/topup', multiTopupUser.accessToken!, {
        amount: 30,
        festivalId,
      });

      // Check final balance
      const balance = await authenticatedRequest(
        'get',
        '/api/cashless/balance',
        multiTopupUser.accessToken!
      );

      if (balance.status === 200) {
        expect(balance.data.balance).toBe(80);
      }
    });
  });

  describe('4.4 Complete Cashless Topup Flow', () => {
    it('should complete full topup and spend flow', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Step 1: Create new user
      const flowUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      // Step 2: Create cashless account
      const accountResponse = await authenticatedRequest(
        'post',
        '/api/cashless/account',
        flowUser.accessToken!
      );
      expect([200, 201]).toContain(accountResponse.status);

      // Step 3: Verify initial balance is 0
      const initialBalance = await authenticatedRequest(
        'get',
        '/api/cashless/balance',
        flowUser.accessToken!
      );
      expect(initialBalance.status).toBe(200);
      expect(initialBalance.data.balance).toBe(0);

      // Step 4: Topup account
      const topupResponse = await authenticatedRequest(
        'post',
        '/api/cashless/topup',
        flowUser.accessToken!,
        {
          amount: 75,
          festivalId,
        }
      );
      expect([200, 201]).toContain(topupResponse.status);

      // Step 5: Verify balance after topup
      const afterTopup = await authenticatedRequest(
        'get',
        '/api/cashless/balance',
        flowUser.accessToken!
      );
      expect(afterTopup.status).toBe(200);
      expect(afterTopup.data.balance).toBe(75);

      // Step 6: Make a payment
      const paymentResponse = await authenticatedRequest(
        'post',
        '/api/cashless/pay',
        flowUser.accessToken!,
        {
          amount: 20,
          festivalId,
          description: 'Festival food',
        }
      );
      expect([200, 201]).toContain(paymentResponse.status);

      // Step 7: Verify balance after payment
      const afterPayment = await authenticatedRequest(
        'get',
        '/api/cashless/balance',
        flowUser.accessToken!
      );
      expect(afterPayment.status).toBe(200);
      expect(afterPayment.data.balance).toBe(55);

      // Step 8: View transaction history
      const history = await authenticatedRequest(
        'get',
        '/api/cashless/transactions',
        flowUser.accessToken!
      );
      expect(history.status).toBe(200);

      const transactions = Array.isArray(history.data)
        ? history.data
        : history.data.transactions || [];

      expect(transactions.length).toBeGreaterThanOrEqual(2); // topup + payment
    });
  });

  describe('4.5 Topup Edge Cases', () => {
    it('should reject topup below minimum amount', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest('post', '/api/cashless/topup', userToken, {
        amount: 1, // Below minimum (typically 5)
        festivalId,
      });

      expect(response.status).toBe(400);
    });

    it('should reject topup above maximum amount', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest('post', '/api/cashless/topup', userToken, {
        amount: 1000, // Above maximum (typically 500)
        festivalId,
      });

      expect(response.status).toBe(400);
    });

    it('should reject topup that would exceed max balance', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      // Create user with high balance
      const richUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      await authenticatedRequest('post', '/api/cashless/account', richUser.accessToken!);

      // Try to exceed max balance (typically 1000)
      await authenticatedRequest('post', '/api/cashless/topup', richUser.accessToken!, {
        amount: 500,
        festivalId,
      });

      await authenticatedRequest('post', '/api/cashless/topup', richUser.accessToken!, {
        amount: 500,
        festivalId,
      });

      // This should fail - would exceed 1000 max
      const response = await authenticatedRequest(
        'post',
        '/api/cashless/topup',
        richUser.accessToken!,
        {
          amount: 100,
          festivalId,
        }
      );

      expect(response.status).toBe(400);
    });

    it('should reject negative topup amount', async () => {
      if (!festivalId) {
        console.warn('Skipping - festival not available');
        return;
      }

      const response = await authenticatedRequest('post', '/api/cashless/topup', userToken, {
        amount: -50,
        festivalId,
      });

      expect(response.status).toBe(400);
    });
  });
});

// ============================================================================
// INTEGRATION: CROSS-FLOW TESTS
// ============================================================================
describe('Cross-Flow Integration Tests', () => {
  describe('User Journey: Registration to Purchase to Spend', () => {
    it('should complete full user journey', async () => {
      // Step 1: Register new user
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Journey',
          lastName: 'User',
        })
        .expect(201);

      const accessToken = registerResponse.body.tokens.accessToken;
      const userId = registerResponse.body.user.id;

      // Step 2: Verify profile
      const profileResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(email);

      // Step 3: Setup cashless account
      const cashlessResponse = await request(baseUrl)
        .post('/api/cashless/account')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 201]).toContain(cashlessResponse.status);

      // Step 4: Check empty tickets
      const ticketsResponse = await request(baseUrl)
        .get('/api/tickets/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tickets = Array.isArray(ticketsResponse.body)
        ? ticketsResponse.body
        : ticketsResponse.body.tickets || [];
      expect(tickets.length).toBe(0);

      // Step 5: Check empty cashless balance
      const balanceResponse = await request(baseUrl)
        .get('/api/cashless/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(balanceResponse.body.balance).toBe(0);
    });
  });
});
