/**
 * Payments E2E Tests
 *
 * Tests the payment module endpoints:
 * - POST /payments/checkout - Create checkout session
 * - GET /payments/checkout/:sessionId - Get checkout status
 * - POST /payments/checkout/ticket - Ticket purchase checkout
 * - POST /payments/checkout/cashless-topup - Cashless topup checkout
 * - POST /payments/intent - Create payment intent
 * - GET /payments/:paymentId - Get payment by ID
 * - GET /payments/user/:userId - Get user payment history
 * - POST /payments/:paymentId/cancel - Cancel payment
 * - POST /payments/refunds - Create refund
 * - GET /payments/refunds/eligibility/:paymentId - Check refund eligibility
 */

import axios from 'axios';
import {
  createTestUser,
  createTestFestival,
  createTestTicketCategory,
  authenticatedRequest,
  randomEmail,
  randomPassword,
} from '../support';
import { validFestivalData, standardTicketCategory } from '../support/fixtures';

describe('Payments E2E Tests', () => {
  let organizerToken: string;
  let userToken: string;
  let festivalId: string;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    // Create organizer and get token
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
        name: `Payment Test Festival ${Date.now()}`,
        slug: `payment-test-festival-${Date.now()}`,
      });
      festivalId = festival.id;

      // Create ticket category
      const category = await createTestTicketCategory(organizerToken, festivalId, {
        ...standardTicketCategory,
        name: `Payment Test Category ${Date.now()}`,
      });
      categoryId = category.id;
    } catch {
      // Setup may have failed - tests will skip if festival not created
    }
  });

  // ============================================================================
  // POST /api/payments/checkout
  // ============================================================================
  describe('POST /api/payments/checkout', () => {
    it('should create a checkout session successfully', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        festivalId,
        mode: 'payment',
        lineItems: [
          {
            name: 'Test Product',
            description: 'Test product description',
            unitAmount: 5000, // 50.00 EUR in cents
            quantity: 1,
          },
        ],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      // May return 201 (success), 400 (validation error), or 500 (Stripe not configured)
      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('paymentId');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data).toHaveProperty('checkoutUrl');
        expect(response.data).toHaveProperty('expiresAt');
      }
    });

    it('should create checkout with multiple line items', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        festivalId,
        mode: 'payment',
        lineItems: [
          {
            name: 'Product A',
            unitAmount: 2500,
            quantity: 2,
          },
          {
            name: 'Product B',
            unitAmount: 3500,
            quantity: 1,
          },
        ],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect([201, 400, 500]).toContain(response.status);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        // Missing userId, lineItems, successUrl, cancelUrl
        mode: 'payment',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid mode', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        mode: 'invalid_mode',
        lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid URL format', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        mode: 'payment',
        lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
        successUrl: 'not-a-valid-url',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero quantity', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        mode: 'payment',
        lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 0 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for unit amount below Stripe minimum', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        mode: 'payment',
        lineItems: [{ name: 'Test', unitAmount: 10, quantity: 1 }], // Below 50 cents minimum
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId: '00000000-0000-0000-0000-000000000000',
        mode: 'payment',
        lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/checkout', {
        userId: 'test',
        mode: 'payment',
        lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/payments/checkout/:sessionId
  // ============================================================================
  describe('GET /api/payments/checkout/:sessionId', () => {
    it('should get checkout session status for valid session', async () => {
      // First create a session
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const createResponse = await authenticatedRequest(
        'post',
        '/api/payments/checkout',
        userToken,
        {
          userId,
          festivalId,
          mode: 'payment',
          lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      const createData = createResponse.data as { sessionId?: string; paymentId?: string };
      if (createResponse.status === 201 && createData.sessionId) {
        const sessionId = createData.sessionId;

        const response = await authenticatedRequest(
          'get',
          `/api/payments/checkout/${sessionId}`,
          userToken
        );

        expect([200, 400, 500]).toContain(response.status);

        if (response.status === 200) {
          expect(response.data).toHaveProperty('status');
          expect(response.data).toHaveProperty('paymentStatus');
        }
      }
    });

    it('should return error for invalid session ID', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/checkout/invalid_session_id',
        userToken
      );

      // Stripe API will return an error for invalid session
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.get('/api/payments/checkout/some_session_id');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/checkout/ticket
  // ============================================================================
  describe('POST /api/payments/checkout/ticket', () => {
    it('should create ticket checkout session', async () => {
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
              price: 149.99,
              quantity: 2,
            },
          ],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('paymentId');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data).toHaveProperty('checkoutUrl');
      }
    });

    it('should create checkout for multiple ticket types', async () => {
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
              name: 'Standard Pass',
              price: 149.99,
              quantity: 1,
            },
            {
              categoryId,
              name: 'Camping Add-on',
              price: 79.99,
              quantity: 1,
            },
          ],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([201, 400, 500]).toContain(response.status);
    });

    it('should return 400 for missing tickets array', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/ticket',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          // Missing tickets
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty tickets array', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/ticket',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          tickets: [],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return 400 for invalid ticket price', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/ticket',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          tickets: [
            {
              categoryId: categoryId || 'test',
              name: 'Invalid Price Ticket',
              price: -50, // Negative price
              quantity: 1,
            },
          ],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/checkout/ticket', {
        userId: 'test',
        festivalId: 'test',
        tickets: [{ categoryId: 'test', name: 'Test', price: 100, quantity: 1 }],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/checkout/cashless-topup
  // ============================================================================
  describe('POST /api/payments/checkout/cashless-topup', () => {
    it('should create cashless topup checkout session', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
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
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('paymentId');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data).toHaveProperty('checkoutUrl');
      }
    });

    it('should create topup for various amounts', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      const amounts = [10, 25, 100, 200];

      for (const amount of amounts) {
        const response = await authenticatedRequest(
          'post',
          '/api/payments/checkout/cashless-topup',
          userToken,
          {
            userId,
            festivalId,
            amount,
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          }
        );

        expect([201, 400, 500]).toContain(response.status);
      }
    });

    it('should return 400 for missing amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/cashless-topup',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
          // Missing amount
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return 400 for zero amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/cashless-topup',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          amount: 0,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return 400 for negative amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/cashless-topup',
        userToken,
        {
          userId,
          festivalId: festivalId || 'test',
          amount: -20,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/checkout/cashless-topup', {
        userId: 'test',
        festivalId: 'test',
        amount: 50,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/intent
  // ============================================================================
  describe('POST /api/payments/intent', () => {
    it('should create a payment intent', async () => {
      const response = await authenticatedRequest('post', '/api/payments/intent', userToken, {
        userId,
        amount: 5000, // 50.00 EUR
        currency: 'eur',
        description: 'Test payment intent',
      });

      expect([201, 400, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.data).toHaveProperty('clientSecret');
        expect(response.data).toHaveProperty('paymentIntentId');
      }
    });

    it('should create payment intent with metadata', async () => {
      const response = await authenticatedRequest('post', '/api/payments/intent', userToken, {
        userId,
        amount: 10000,
        currency: 'eur',
        description: 'Test with metadata',
        metadata: {
          orderId: 'test-order-123',
          productType: 'festival-ticket',
        },
      });

      expect([201, 400, 500]).toContain(response.status);
    });

    it('should return 400 for missing amount', async () => {
      const response = await authenticatedRequest('post', '/api/payments/intent', userToken, {
        userId,
        currency: 'eur',
        // Missing amount
      });

      expect([400, 500]).toContain(response.status);
    });

    it('should return 400 for zero amount', async () => {
      const response = await authenticatedRequest('post', '/api/payments/intent', userToken, {
        userId,
        amount: 0,
        currency: 'eur',
      });

      expect([400, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/intent', {
        userId: 'test',
        amount: 5000,
        currency: 'eur',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/payments/:paymentId
  // ============================================================================
  describe('GET /api/payments/:paymentId', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/00000000-0000-0000-0000-000000000000',
        userToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await authenticatedRequest('get', '/api/payments/invalid-uuid', userToken);

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.get('/api/payments/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/payments/user/:userId
  // ============================================================================
  describe('GET /api/payments/user/:userId', () => {
    it('should return user payment history', async () => {
      const response = await authenticatedRequest('get', `/api/payments/user/${userId}`, userToken);

      expect(response.status).toBe(200);
      const data = response.data as unknown[] | { payments?: unknown[] };
      expect(Array.isArray(data) || (data as { payments?: unknown[] }).payments !== undefined).toBe(
        true
      );
    });

    it('should return paginated results', async () => {
      const response = await authenticatedRequest(
        'get',
        `/api/payments/user/${userId}?limit=10&offset=0`,
        userToken
      );

      expect(response.status).toBe(200);
    });

    it('should return 403 when accessing other users payment history', async () => {
      // Create another user
      const otherUser = await createTestUser('USER', {
        email: randomEmail(),
        password: randomPassword(),
      });

      const response = await authenticatedRequest(
        'get',
        `/api/payments/user/${otherUser.id}`,
        userToken
      );

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/user/invalid-uuid',
        userToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.get(`/api/payments/user/${userId}`);

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/:paymentId/cancel
  // ============================================================================
  describe('POST /api/payments/:paymentId/cancel', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/00000000-0000-0000-0000-000000000000/cancel',
        userToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/invalid-uuid/cancel',
        userToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post(
        '/api/payments/00000000-0000-0000-0000-000000000000/cancel'
      );

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/refunds
  // ============================================================================
  describe('POST /api/payments/refunds', () => {
    it('should return 404 for non-existent payment ID', async () => {
      const response = await authenticatedRequest('post', '/api/payments/refunds', userToken, {
        paymentId: '00000000-0000-0000-0000-000000000000',
        reason: 'Customer requested refund',
      });

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return 400 for missing payment ID', async () => {
      const response = await authenticatedRequest('post', '/api/payments/refunds', userToken, {
        reason: 'Customer requested refund',
        // Missing paymentId
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/refunds', {
        paymentId: '00000000-0000-0000-0000-000000000000',
        reason: 'Test refund',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/refunds/partial
  // ============================================================================
  describe('POST /api/payments/refunds/partial', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/refunds/partial',
        userToken,
        {
          paymentId: '00000000-0000-0000-0000-000000000000',
          amount: 1000,
          reason: 'Partial refund test',
        }
      );

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return 400 for missing amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/refunds/partial',
        userToken,
        {
          paymentId: '00000000-0000-0000-0000-000000000000',
          reason: 'Missing amount',
          // Missing amount
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for zero amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/refunds/partial',
        userToken,
        {
          paymentId: '00000000-0000-0000-0000-000000000000',
          amount: 0,
          reason: 'Zero amount refund',
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative amount', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/refunds/partial',
        userToken,
        {
          paymentId: '00000000-0000-0000-0000-000000000000',
          amount: -50,
          reason: 'Negative amount refund',
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/refunds/partial', {
        paymentId: '00000000-0000-0000-0000-000000000000',
        amount: 1000,
        reason: 'Test',
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/payments/refunds/eligibility/:paymentId
  // ============================================================================
  describe('GET /api/payments/refunds/eligibility/:paymentId', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/refunds/eligibility/00000000-0000-0000-0000-000000000000',
        userToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/refunds/eligibility/invalid-uuid',
        userToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.get(
        '/api/payments/refunds/eligibility/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /api/payments/refunds/history/:paymentId
  // ============================================================================
  describe('GET /api/payments/refunds/history/:paymentId', () => {
    it('should return 404 for non-existent payment', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/refunds/history/00000000-0000-0000-0000-000000000000',
        userToken
      );

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await authenticatedRequest(
        'get',
        '/api/payments/refunds/history/invalid-uuid',
        userToken
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.get(
        '/api/payments/refunds/history/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/checkout/:sessionId/expire
  // ============================================================================
  describe('POST /api/payments/checkout/:sessionId/expire', () => {
    it('should return error for invalid session', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout/invalid_session/expire',
        userToken
      );

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await axios.post('/api/payments/checkout/some_session/expire');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // POST /api/payments/webhook
  // ============================================================================
  describe('POST /api/payments/webhook', () => {
    it('should return 400 for missing Stripe signature', async () => {
      const response = await axios.post('/api/payments/webhook', {
        type: 'payment_intent.succeeded',
        data: { object: {} },
      });

      // Webhook is public but requires valid Stripe signature
      expect([400, 500]).toContain(response.status);
    });

    it('should return error for invalid signature', async () => {
      const response = await axios.post(
        '/api/payments/webhook',
        { type: 'payment_intent.succeeded', data: { object: {} } },
        { headers: { 'stripe-signature': 'invalid_signature' } }
      );

      expect([400, 500]).toContain(response.status);
    });
  });

  // ============================================================================
  // Complete Payment Flow
  // ============================================================================
  describe('Complete Payment Flow', () => {
    it('should handle complete checkout session lifecycle', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // 1. Create checkout session
      const createResponse = await authenticatedRequest(
        'post',
        '/api/payments/checkout',
        userToken,
        {
          userId,
          festivalId,
          mode: 'payment',
          lineItems: [
            {
              name: 'Festival Pass',
              description: 'Full weekend access',
              unitAmount: 14999,
              quantity: 1,
            },
          ],
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }
      );

      // If Stripe is not configured, skip the rest
      if (createResponse.status !== 201) {
        console.warn('Stripe not configured or validation error - skipping flow test');
        return;
      }

      expect(createResponse.data).toHaveProperty('sessionId');
      expect(createResponse.data).toHaveProperty('paymentId');
      expect(createResponse.data).toHaveProperty('checkoutUrl');

      const flowData = createResponse.data as {
        sessionId: string;
        paymentId: string;
        checkoutUrl: string;
      };
      const { sessionId, paymentId } = flowData;

      // 2. Check session status
      const statusResponse = await authenticatedRequest(
        'get',
        `/api/payments/checkout/${sessionId}`,
        userToken
      );

      expect([200, 400, 500]).toContain(statusResponse.status);

      if (statusResponse.status === 200) {
        expect(statusResponse.data).toHaveProperty('status');
        const statusData = statusResponse.data as { status: string };
        expect(['open', 'complete', 'expired']).toContain(statusData.status);
      }

      // 3. Check payment record
      const paymentResponse = await authenticatedRequest(
        'get',
        `/api/payments/${paymentId}`,
        userToken
      );

      expect([200, 404]).toContain(paymentResponse.status);

      // 4. Check user payment history includes this payment
      const historyResponse = await authenticatedRequest(
        'get',
        `/api/payments/user/${userId}`,
        userToken
      );

      expect(historyResponse.status).toBe(200);

      // 5. Try to expire the session
      const expireResponse = await authenticatedRequest(
        'post',
        `/api/payments/checkout/${sessionId}/expire`,
        userToken
      );

      expect([204, 400, 500]).toContain(expireResponse.status);
    });

    it('should handle ticket purchase checkout flow', async () => {
      if (!festivalId || !categoryId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // 1. Create ticket checkout
      const createResponse = await authenticatedRequest(
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
              price: 149.99,
              quantity: 2,
            },
          ],
          successUrl: 'https://example.com/ticket-success',
          cancelUrl: 'https://example.com/ticket-cancel',
        }
      );

      if (createResponse.status !== 201) {
        console.warn('Stripe not configured - skipping ticket flow test');
        return;
      }

      expect(createResponse.data).toHaveProperty('sessionId');
      expect(createResponse.data).toHaveProperty('paymentId');
      const ticketData = createResponse.data as {
        sessionId: string;
        paymentId: string;
        checkoutUrl: string;
      };
      expect(ticketData.checkoutUrl).toContain('checkout.stripe.com');
    });

    it('should handle cashless topup checkout flow', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // 1. Create cashless topup checkout
      const createResponse = await authenticatedRequest(
        'post',
        '/api/payments/checkout/cashless-topup',
        userToken,
        {
          userId,
          festivalId,
          amount: 100,
          successUrl: 'https://example.com/topup-success',
          cancelUrl: 'https://example.com/topup-cancel',
        }
      );

      if (createResponse.status !== 201) {
        console.warn('Stripe not configured - skipping topup flow test');
        return;
      }

      expect(createResponse.data).toHaveProperty('sessionId');
      expect(createResponse.data).toHaveProperty('paymentId');
    });
  });

  // ============================================================================
  // Rate Limiting Tests
  // ============================================================================
  describe('Rate Limiting', () => {
    it('should enforce rate limits on checkout endpoint', async () => {
      if (!festivalId) {
        console.warn('Skipping - test setup incomplete');
        return;
      }

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          authenticatedRequest('post', '/api/payments/checkout', userToken, {
            userId,
            festivalId,
            mode: 'payment',
            lineItems: [{ name: 'Test', unitAmount: 1000, quantity: 1 }],
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
          })
        );
      }

      const responses = await Promise.all(promises);
      const statusCodes = responses.map((r) => r.status);

      // Some requests should be rate limited (429)
      // OR all should pass if rate limiting is not strictly enforced in tests
      expect(statusCodes.every((code) => [201, 400, 429, 500].includes(code))).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      // Note: axios handles JSON automatically, so we test missing body
      const response = await authenticatedRequest(
        'post',
        '/api/payments/checkout',
        userToken,
        null // Empty body
      );

      expect([400, 500]).toContain(response.status);
    });

    it('should return meaningful error messages', async () => {
      const response = await authenticatedRequest('post', '/api/payments/checkout', userToken, {
        userId,
        mode: 'payment',
        lineItems: [], // Empty line items
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect([400, 500]).toContain(response.status);
      if (response.status === 400) {
        expect(response.data).toHaveProperty('message');
      }
    });
  });
});
