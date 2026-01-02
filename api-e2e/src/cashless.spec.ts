/**
 * Cashless E2E Tests
 *
 * Tests the complete cashless payment flow:
 * - Account creation
 * - Top-up operations
 * - Payment processing
 * - Transfer between accounts
 * - Transaction history
 * - NFC tag linking
 */

import {
  api,
  createAuthenticatedUser,
  authenticatedRequest,
  createFestival,
  publishFestival,
  UserRole,
  sleep,
} from './support/test-helpers';
import { v4 as uuidv4 } from 'uuid';

describe('Cashless E2E Tests', () => {
  // ============================================
  // Test Data Setup Helpers
  // ============================================

  async function setupFestival() {
    const organizer = await createAuthenticatedUser({
      role: UserRole.ORGANIZER,
    });
    const { festival } = await createFestival(organizer.tokens.accessToken);
    await publishFestival(organizer.tokens.accessToken, festival.id);
    return { organizer, festival };
  }

  function generateNfcTagId(): string {
    return `NFC-${uuidv4().substring(0, 12).toUpperCase()}`;
  }

  // ============================================
  // Account Creation Tests
  // ============================================
  describe('Account Management', () => {
    describe('POST /cashless/account', () => {
      it('should create cashless account', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        expect(response.status).toBe(201);
        const data = response.data.data || response.data;
        expect(data.id).toBeDefined();
        expect(data.balance).toBe(0);
        expect(data.isActive).toBe(true);
      });

      it('should reject duplicate account creation', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // First account creation
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        // Second attempt - should fail
        const response = await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        expect([400, 409]).toContain(response.status);
      });

      it('should reject account creation without authentication', async () => {
        const { festival } = await setupFestival();

        const response = await api.post('/cashless/account', {
          festivalId: festival.id,
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /cashless/me', () => {
      it('should return account details', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Create account first
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'get',
          '/cashless/me',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.id).toBeDefined();
        expect(data.balance).toBeDefined();
        expect(data.isActive).toBe(true);
      });

      it('should return 404 for user without account', async () => {
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const response = await authenticatedRequest(
          'get',
          '/cashless/me',
          user.tokens.accessToken
        );

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================
  // Top-up Tests
  // ============================================
  describe('Top-up Operations', () => {
    describe('POST /cashless/topup', () => {
      it('should top up account', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Create account
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        // Top up
        const response = await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          {
            amount: 50,
            festivalId: festival.id,
          }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.newBalance).toBe(50);
        expect(data.transaction).toBeDefined();
        expect(data.transaction.type).toBe('TOPUP');
      });

      it('should accumulate multiple top-ups', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Create account
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        // First top up
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 30, festivalId: festival.id }
        );

        // Second top up
        const response = await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.newBalance).toBe(50);
      });

      it('should reject negative top-up amount', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: -20, festivalId: festival.id }
        );

        expect(response.status).toBe(400);
      });

      it('should reject zero top-up amount', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 0, festivalId: festival.id }
        );

        expect(response.status).toBe(400);
      });

      it('should reject top-up for non-existent account', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Don't create account

        const response = await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 50, festivalId: festival.id }
        );

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================
  // Payment Tests
  // ============================================
  describe('Payment Operations', () => {
    describe('POST /cashless/pay', () => {
      it('should process payment successfully', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Create account and top up
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        // Make payment
        const response = await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          {
            amount: 25,
            festivalId: festival.id,
            description: 'Beer purchase',
          }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.newBalance).toBe(75);
        expect(data.transaction).toBeDefined();
        expect(data.transaction.type).toBe('PAYMENT');
        expect(data.transaction.amount).toBe(25);
      });

      it('should reject payment exceeding balance', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        // Create account with limited balance
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id }
        );

        // Try to pay more than balance
        const response = await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          {
            amount: 50,
            festivalId: festival.id,
            description: 'Expensive item',
          }
        );

        expect([400, 402, 422]).toContain(response.status);
      });

      it('should reject negative payment amount', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          {
            amount: -10,
            festivalId: festival.id,
          }
        );

        expect(response.status).toBe(400);
      });

      it('should include transaction in history', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          {
            amount: 30,
            festivalId: festival.id,
            description: 'Test payment',
          }
        );

        // Check transaction history
        const response = await authenticatedRequest(
          'get',
          `/cashless/transactions?festivalId=${festival.id}`,
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        expect(transactions.length).toBeGreaterThanOrEqual(2); // topup + payment
        expect(transactions.some((t: any) => t.type === 'PAYMENT')).toBe(true);
      });
    });
  });

  // ============================================
  // Transfer Tests
  // ============================================
  describe('Transfer Operations', () => {
    describe('POST /cashless/transfer', () => {
      it('should transfer between accounts', async () => {
        const { festival } = await setupFestival();
        const sender = await createAuthenticatedUser({ role: UserRole.USER });
        const receiver = await createAuthenticatedUser({ role: UserRole.USER });

        // Create accounts
        await authenticatedRequest(
          'post',
          '/cashless/account',
          sender.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountResponse = await authenticatedRequest(
          'post',
          '/cashless/account',
          receiver.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountId =
          receiverAccountResponse.data.data?.id ||
          receiverAccountResponse.data.id;

        // Top up sender
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          sender.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        // Transfer
        const response = await authenticatedRequest(
          'post',
          '/cashless/transfer',
          sender.tokens.accessToken,
          {
            toAccountId: receiverAccountId,
            amount: 40,
            festivalId: festival.id,
          }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.senderNewBalance).toBe(60);
        expect(data.recipientNewBalance).toBe(40);
      });

      it('should reject transfer exceeding balance', async () => {
        const { festival } = await setupFestival();
        const sender = await createAuthenticatedUser({ role: UserRole.USER });
        const receiver = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          sender.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountResponse = await authenticatedRequest(
          'post',
          '/cashless/account',
          receiver.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountId =
          receiverAccountResponse.data.data?.id ||
          receiverAccountResponse.data.id;

        await authenticatedRequest(
          'post',
          '/cashless/topup',
          sender.tokens.accessToken,
          { amount: 30, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/transfer',
          sender.tokens.accessToken,
          {
            toAccountId: receiverAccountId,
            amount: 50,
            festivalId: festival.id,
          }
        );

        expect([400, 402, 422]).toContain(response.status);
      });

      it('should reject transfer to non-existent account', async () => {
        const { festival } = await setupFestival();
        const sender = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          sender.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          sender.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/transfer',
          sender.tokens.accessToken,
          {
            toAccountId: uuidv4(),
            amount: 50,
            festivalId: festival.id,
          }
        );

        expect(response.status).toBe(404);
      });

      it('should reject self-transfer', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        const accountResponse = await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        const accountId =
          accountResponse.data.data?.id || accountResponse.data.id;

        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/transfer',
          user.tokens.accessToken,
          {
            toAccountId: accountId,
            amount: 50,
            festivalId: festival.id,
          }
        );

        expect([400, 422]).toContain(response.status);
      });

      it('should create transactions for both sender and receiver', async () => {
        const { festival } = await setupFestival();
        const sender = await createAuthenticatedUser({ role: UserRole.USER });
        const receiver = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          sender.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountResponse = await authenticatedRequest(
          'post',
          '/cashless/account',
          receiver.tokens.accessToken,
          { festivalId: festival.id }
        );
        const receiverAccountId =
          receiverAccountResponse.data.data?.id ||
          receiverAccountResponse.data.id;

        await authenticatedRequest(
          'post',
          '/cashless/topup',
          sender.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        await authenticatedRequest(
          'post',
          '/cashless/transfer',
          sender.tokens.accessToken,
          {
            toAccountId: receiverAccountId,
            amount: 40,
            festivalId: festival.id,
          }
        );

        // Check receiver transactions
        const receiverTransactions = await authenticatedRequest(
          'get',
          `/cashless/transactions?festivalId=${festival.id}`,
          receiver.tokens.accessToken
        );

        expect(receiverTransactions.status).toBe(200);
        const data =
          receiverTransactions.data.data || receiverTransactions.data;
        const transactions = data.transactions || data;
        expect(transactions.some((t: any) => t.type === 'TRANSFER')).toBe(true);
      });
    });
  });

  // ============================================
  // Transaction History Tests
  // ============================================
  describe('Transaction History', () => {
    describe('GET /cashless/transactions', () => {
      it('should return transaction history', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id, description: 'Payment 1' }
        );
        await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          { amount: 15, festivalId: festival.id, description: 'Payment 2' }
        );

        const response = await authenticatedRequest(
          'get',
          '/cashless/transactions',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThanOrEqual(3);
      });

      it('should filter by festival', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 50, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'get',
          `/cashless/transactions?festivalId=${festival.id}`,
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        transactions.forEach((t: any) => {
          if (t.festival) {
            expect(t.festival.id).toBe(festival.id);
          }
        });
      });

      it('should filter by transaction type', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'get',
          '/cashless/transactions?type=PAYMENT',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        transactions.forEach((t: any) => {
          expect(t.type).toBe('PAYMENT');
        });
      });

      it('should paginate results', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        // Create multiple transactions
        for (let i = 0; i < 5; i++) {
          await authenticatedRequest(
            'post',
            '/cashless/pay',
            user.tokens.accessToken,
            { amount: 5, festivalId: festival.id }
          );
        }

        const response = await authenticatedRequest(
          'get',
          '/cashless/transactions?limit=3',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        expect(transactions.length).toBeLessThanOrEqual(3);
        expect(data.pagination).toBeDefined();
      });

      it('should include balance snapshots', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'get',
          '/cashless/transactions',
          user.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        const transactions = data.transactions || data;
        transactions.forEach((t: any) => {
          expect(t.balanceBefore).toBeDefined();
          expect(t.balanceAfter).toBeDefined();
        });
      });
    });
  });

  // ============================================
  // NFC Tag Tests
  // ============================================
  describe('NFC Tag Operations', () => {
    describe('POST /cashless/link-nfc', () => {
      it('should link NFC tag to account', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });
        const nfcTagId = generateNfcTagId();

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.nfcTagId).toBe(nfcTagId);
      });

      it('should reject linking already used NFC tag', async () => {
        const { festival } = await setupFestival();
        const user1 = await createAuthenticatedUser({ role: UserRole.USER });
        const user2 = await createAuthenticatedUser({ role: UserRole.USER });
        const nfcTagId = generateNfcTagId();

        // User 1 links NFC tag
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user1.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user1.tokens.accessToken,
          { nfcTagId }
        );

        // User 2 tries to link same tag
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user2.tokens.accessToken,
          { festivalId: festival.id }
        );
        const response = await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user2.tokens.accessToken,
          { nfcTagId }
        );

        expect([400, 409]).toContain(response.status);
      });

      it('should allow unlinking and relinking NFC tag', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });
        const nfcTagId1 = generateNfcTagId();
        const nfcTagId2 = generateNfcTagId();

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        // Link first tag
        await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId: nfcTagId1 }
        );

        // Link new tag (should replace)
        const response = await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId: nfcTagId2 }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.nfcTagId).toBe(nfcTagId2);
      });
    });

    describe('GET /cashless/balance/:nfcTagId', () => {
      it('should return balance by NFC tag', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });
        const staff = await createAuthenticatedUser({ role: UserRole.CASHIER });
        const nfcTagId = generateNfcTagId();

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 75, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId }
        );

        // Staff checks balance
        const response = await authenticatedRequest(
          'get',
          `/cashless/balance/${nfcTagId}`,
          staff.tokens.accessToken
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.balance).toBe(75);
      });

      it('should return 404 for unknown NFC tag', async () => {
        const staff = await createAuthenticatedUser({ role: UserRole.CASHIER });
        const unknownNfcTagId = generateNfcTagId();

        const response = await authenticatedRequest(
          'get',
          `/cashless/balance/${unknownNfcTagId}`,
          staff.tokens.accessToken
        );

        expect(response.status).toBe(404);
      });
    });

    describe('POST /cashless/pay-nfc/:nfcTagId', () => {
      it('should process payment by NFC tag', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });
        const cashier = await createAuthenticatedUser({
          role: UserRole.CASHIER,
        });
        const nfcTagId = generateNfcTagId();

        // Setup user account
        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 100, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId }
        );

        // Cashier processes payment
        const response = await authenticatedRequest(
          'post',
          `/cashless/pay-nfc/${nfcTagId}`,
          cashier.tokens.accessToken,
          {
            amount: 35,
            festivalId: festival.id,
            description: 'Food purchase',
          }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.newBalance).toBe(65);
      });

      it('should reject NFC payment exceeding balance', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });
        const cashier = await createAuthenticatedUser({
          role: UserRole.CASHIER,
        });
        const nfcTagId = generateNfcTagId();

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/link-nfc',
          user.tokens.accessToken,
          { nfcTagId }
        );

        const response = await authenticatedRequest(
          'post',
          `/cashless/pay-nfc/${nfcTagId}`,
          cashier.tokens.accessToken,
          {
            amount: 50,
            festivalId: festival.id,
          }
        );

        expect([400, 402, 422]).toContain(response.status);
      });
    });
  });

  // ============================================
  // Balance Refund Tests
  // ============================================
  describe('Balance Refund', () => {
    describe('POST /cashless/refund-balance', () => {
      it('should request balance refund', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );
        await authenticatedRequest(
          'post',
          '/cashless/topup',
          user.tokens.accessToken,
          { amount: 50, festivalId: festival.id }
        );

        // Use some balance
        await authenticatedRequest(
          'post',
          '/cashless/pay',
          user.tokens.accessToken,
          { amount: 20, festivalId: festival.id }
        );

        // Request refund of remaining balance
        const response = await authenticatedRequest(
          'post',
          '/cashless/refund-balance',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        expect(response.status).toBe(200);
        const data = response.data.data || response.data;
        expect(data.refundedAmount).toBe(30);
        expect(data.newBalance).toBe(0);
      });

      it('should reject refund with zero balance', async () => {
        const { festival } = await setupFestival();
        const user = await createAuthenticatedUser({ role: UserRole.USER });

        await authenticatedRequest(
          'post',
          '/cashless/account',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        const response = await authenticatedRequest(
          'post',
          '/cashless/refund-balance',
          user.tokens.accessToken,
          { festivalId: festival.id }
        );

        expect([400, 422]).toContain(response.status);
      });
    });
  });

  // ============================================
  // Complete Cashless Flow Test
  // ============================================
  describe('Complete Cashless Flow', () => {
    it('should complete account -> topup -> pay -> transfer -> history flow', async () => {
      const { festival } = await setupFestival();
      const user1 = await createAuthenticatedUser({ role: UserRole.USER });
      const user2 = await createAuthenticatedUser({ role: UserRole.USER });
      const cashier = await createAuthenticatedUser({ role: UserRole.CASHIER });
      const nfcTagId = generateNfcTagId();

      // Step 1: Create accounts
      await authenticatedRequest(
        'post',
        '/cashless/account',
        user1.tokens.accessToken,
        { festivalId: festival.id }
      );
      const user2AccountResponse = await authenticatedRequest(
        'post',
        '/cashless/account',
        user2.tokens.accessToken,
        { festivalId: festival.id }
      );
      const user2AccountId =
        user2AccountResponse.data.data?.id || user2AccountResponse.data.id;

      // Step 2: Link NFC to user1
      await authenticatedRequest(
        'post',
        '/cashless/link-nfc',
        user1.tokens.accessToken,
        { nfcTagId }
      );

      // Step 3: Top up user1
      const topupResponse = await authenticatedRequest(
        'post',
        '/cashless/topup',
        user1.tokens.accessToken,
        { amount: 100, festivalId: festival.id }
      );
      expect(topupResponse.status).toBe(200);
      expect(topupResponse.data.data.newBalance).toBe(100);

      // Step 4: User1 makes payment via app
      const payResponse = await authenticatedRequest(
        'post',
        '/cashless/pay',
        user1.tokens.accessToken,
        { amount: 20, festivalId: festival.id, description: 'Drink' }
      );
      expect(payResponse.status).toBe(200);
      expect(payResponse.data.data.newBalance).toBe(80);

      // Step 5: Cashier processes NFC payment
      const nfcPayResponse = await authenticatedRequest(
        'post',
        `/cashless/pay-nfc/${nfcTagId}`,
        cashier.tokens.accessToken,
        { amount: 15, festivalId: festival.id, description: 'Food' }
      );
      expect(nfcPayResponse.status).toBe(200);
      expect(nfcPayResponse.data.data.newBalance).toBe(65);

      // Step 6: Transfer to user2
      const transferResponse = await authenticatedRequest(
        'post',
        '/cashless/transfer',
        user1.tokens.accessToken,
        {
          toAccountId: user2AccountId,
          amount: 25,
          festivalId: festival.id,
        }
      );
      expect(transferResponse.status).toBe(200);
      expect(transferResponse.data.data.senderNewBalance).toBe(40);
      expect(transferResponse.data.data.recipientNewBalance).toBe(25);

      // Step 7: Check transaction history
      const historyResponse = await authenticatedRequest(
        'get',
        `/cashless/transactions?festivalId=${festival.id}`,
        user1.tokens.accessToken
      );
      expect(historyResponse.status).toBe(200);
      const transactions =
        historyResponse.data.data.transactions || historyResponse.data.data;
      expect(transactions.length).toBeGreaterThanOrEqual(4);

      // Step 8: Verify account balance
      const accountResponse = await authenticatedRequest(
        'get',
        '/cashless/me',
        user1.tokens.accessToken
      );
      expect(accountResponse.status).toBe(200);
      expect(accountResponse.data.data.balance).toBe(40);
    });
  });
});
