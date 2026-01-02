/**
 * Authentication E2E Tests
 *
 * Tests the complete authentication flow:
 * - User registration
 * - Email verification
 * - Login with credentials
 * - Token refresh
 * - Logout
 * - RBAC guards
 */

import {
  api,
  generateUserData,
  registerUser,
  loginUser,
  createAuthenticatedUser,
  getAuthHeaders,
  authenticatedRequest,
  expectSuccess,
  expectError,
  UserRole,
  sleep,
} from './support/test-helpers';

describe('Authentication E2E Tests', () => {
  // ============================================
  // Registration Tests
  // ============================================
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = generateUserData();

      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      expect(response.status).toBe(201);
      const data = response.data.data || response.data;
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email.toLowerCase());
      expect(data.user.firstName).toBe(userData.firstName);
      expect(data.user.lastName).toBe(userData.lastName);
      expect(data.user.role).toBe(UserRole.USER);
      expect(data.message).toContain('Registration successful');
      // Password should never be returned
      expect(data.user.password).toBeUndefined();
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await api.post('/auth/register', {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
    });

    it('should reject registration with weak password', async () => {
      const userData = generateUserData({ password: '123' });

      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      expect(response.status).toBe(400);
    });

    it('should reject registration with missing required fields', async () => {
      const response = await api.post('/auth/register', {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate email registration', async () => {
      const userData = generateUserData();

      // First registration
      await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      // Duplicate registration
      const response = await api.post('/auth/register', {
        email: userData.email,
        password: 'AnotherPassword123!',
        firstName: 'Another',
        lastName: 'User',
      });

      expect(response.status).toBe(409);
      expect(response.data.message).toContain('already exists');
    });

    it('should normalize email to lowercase', async () => {
      const userData = generateUserData();
      const upperCaseEmail = userData.email.toUpperCase();

      const response = await api.post('/auth/register', {
        email: upperCaseEmail,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      expect(response.status).toBe(201);
      const data = response.data.data || response.data;
      expect(data.user.email).toBe(userData.email.toLowerCase());
    });
  });

  // ============================================
  // Email Verification Tests
  // ============================================
  describe('POST /auth/verify-email', () => {
    it('should accept email verification request', async () => {
      // Note: In a real test, you'd need to extract the token from the email
      // For now, we test the endpoint accepts valid token format
      const response = await api.post('/auth/verify-email', {
        token: 'a'.repeat(64), // 64 character hex string
      });

      // The endpoint should respond (success depends on token validity)
      expect(response.status).toBeLessThan(500);
    });

    it('should reject verification with invalid token format', async () => {
      const response = await api.post('/auth/verify-email', {
        token: '',
      });

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Login Tests
  // ============================================
  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const { user } = await registerUser();

      const response = await api.post('/auth/login', {
        email: user.email,
        password: user.password,
      });

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.expiresIn).toBeDefined();
      expect(typeof data.accessToken).toBe('string');
      expect(data.accessToken.length).toBeGreaterThan(0);
    });

    it('should reject login with wrong password', async () => {
      const { user } = await registerUser();

      const response = await api.post('/auth/login', {
        email: user.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('should reject login with non-existent email', async () => {
      const response = await api.post('/auth/login', {
        email: 'nonexistent@festival-test.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('should reject login with missing credentials', async () => {
      const response = await api.post('/auth/login', {});

      expect(response.status).toBe(400);
    });

    it('should handle email case-insensitively', async () => {
      const { user } = await registerUser();

      const response = await api.post('/auth/login', {
        email: user.email.toUpperCase(),
        password: user.password,
      });

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.accessToken).toBeDefined();
    });
  });

  // ============================================
  // Token Refresh Tests
  // ============================================
  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = await createAuthenticatedUser();

      const response = await api.post('/auth/refresh', {
        refreshToken: user.tokens.refreshToken,
      });

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.expiresIn).toBeDefined();
      // New tokens should be different (token rotation)
      expect(data.accessToken).not.toBe(user.tokens.accessToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await api.post('/auth/refresh', {
        refreshToken: 'invalid-refresh-token',
      });

      expect(response.status).toBe(401);
    });

    it('should reject refresh with access token (wrong token type)', async () => {
      const user = await createAuthenticatedUser();

      const response = await api.post('/auth/refresh', {
        refreshToken: user.tokens.accessToken, // Using access token instead
      });

      expect(response.status).toBe(401);
    });

    it('should reject used refresh token (token rotation security)', async () => {
      const user = await createAuthenticatedUser();

      // First refresh - should succeed
      const firstRefresh = await api.post('/auth/refresh', {
        refreshToken: user.tokens.refreshToken,
      });
      expect(firstRefresh.status).toBe(200);

      // Second refresh with old token - should fail
      const secondRefresh = await api.post('/auth/refresh', {
        refreshToken: user.tokens.refreshToken,
      });
      expect(secondRefresh.status).toBe(401);
    });
  });

  // ============================================
  // Logout Tests
  // ============================================
  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const user = await createAuthenticatedUser();

      const response = await authenticatedRequest(
        'post',
        '/auth/logout',
        user.tokens.accessToken
      );

      expect(response.status).toBe(200);
      expect(response.data.message || response.data.data?.message).toContain(
        'Logged out'
      );
    });

    it('should reject logout without authentication', async () => {
      const response = await api.post('/auth/logout');

      expect(response.status).toBe(401);
    });

    it('should invalidate refresh token after logout', async () => {
      const user = await createAuthenticatedUser();

      // Logout
      await authenticatedRequest(
        'post',
        '/auth/logout',
        user.tokens.accessToken
      );

      // Try to use refresh token
      const response = await api.post('/auth/refresh', {
        refreshToken: user.tokens.refreshToken,
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Profile Tests
  // ============================================
  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const user = await createAuthenticatedUser();

      const response = await authenticatedRequest(
        'get',
        '/auth/me',
        user.tokens.accessToken
      );

      expect(response.status).toBe(200);
      const data = response.data.data || response.data;
      expect(data.email).toBe(user.email.toLowerCase());
      expect(data.firstName).toBe(user.firstName);
      expect(data.lastName).toBe(user.lastName);
      expect(data.role).toBeDefined();
      expect(data.status).toBeDefined();
      // Sensitive data should not be exposed
      expect(data.password).toBeUndefined();
      expect(data.passwordHash).toBeUndefined();
      expect(data.refreshToken).toBeUndefined();
    });

    it('should reject unauthenticated profile request', async () => {
      const response = await api.get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with expired token', async () => {
      // Create a token that looks valid but is expired
      // This is a placeholder - in real testing, you'd need to generate an expired JWT
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.invalid';

      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================
  // Password Reset Tests
  // ============================================
  describe('Password Reset Flow', () => {
    describe('POST /auth/forgot-password', () => {
      it('should accept forgot password request for existing user', async () => {
        const { user } = await registerUser();

        const response = await api.post('/auth/forgot-password', {
          email: user.email,
        });

        expect(response.status).toBe(200);
        // Should always return success to prevent email enumeration
        expect(response.data.message || response.data.data?.message).toBeDefined();
      });

      it('should return success even for non-existent email (security)', async () => {
        const response = await api.post('/auth/forgot-password', {
          email: 'nonexistent@festival-test.com',
        });

        // Should return 200 to prevent email enumeration attacks
        expect(response.status).toBe(200);
      });

      it('should reject invalid email format', async () => {
        const response = await api.post('/auth/forgot-password', {
          email: 'invalid-email',
        });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /auth/reset-password', () => {
      it('should accept reset password request with token', async () => {
        const response = await api.post('/auth/reset-password', {
          token: 'a'.repeat(64),
          password: 'NewSecurePassword123!',
        });

        // Endpoint should respond (success depends on token validity)
        expect(response.status).toBeLessThan(500);
      });

      it('should reject weak new password', async () => {
        const response = await api.post('/auth/reset-password', {
          token: 'a'.repeat(64),
          password: '123',
        });

        expect(response.status).toBe(400);
      });
    });
  });

  // ============================================
  // RBAC (Role-Based Access Control) Tests
  // ============================================
  describe('RBAC Guards', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await api.get('/festivals');

      // Public endpoint should be accessible
      expect(response.status).toBeLessThan(500);
      expect(response.status).not.toBe(401);
    });

    it('should protect admin endpoints from regular users', async () => {
      const user = await createAuthenticatedUser();

      // Try to delete a festival (admin only)
      const response = await authenticatedRequest(
        'delete',
        '/festivals/some-festival-id',
        user.tokens.accessToken
      );

      // Should be forbidden (403) or not found (404), not successful
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should allow authenticated users to access protected endpoints', async () => {
      const user = await createAuthenticatedUser();

      const response = await authenticatedRequest(
        'get',
        '/tickets/me',
        user.tokens.accessToken
      );

      // Should succeed (200) or return empty data, not 401/403
      expect([200, 204]).toContain(response.status);
    });
  });

  // ============================================
  // Complete Authentication Flow Test
  // ============================================
  describe('Complete Auth Flow', () => {
    it('should complete register -> verify -> login -> refresh -> logout flow', async () => {
      // Step 1: Register
      const userData = generateUserData();
      const registerResponse = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });
      expect(registerResponse.status).toBe(201);

      // Step 2: Verify email (simulated - in real test, extract token from email)
      const verifyResponse = await api.post('/auth/verify-email', {
        token: 'a'.repeat(64),
      });
      expect(verifyResponse.status).toBeLessThan(500);

      // Step 3: Login
      const loginResponse = await api.post('/auth/login', {
        email: userData.email,
        password: userData.password,
      });
      expect(loginResponse.status).toBe(200);
      const loginData = loginResponse.data.data || loginResponse.data;
      const accessToken = loginData.accessToken;
      const refreshToken = loginData.refreshToken;

      // Step 4: Access protected resource
      const profileResponse = await api.get('/auth/me', {
        headers: getAuthHeaders(accessToken),
      });
      expect(profileResponse.status).toBe(200);

      // Step 5: Refresh token
      const refreshResponse = await api.post('/auth/refresh', {
        refreshToken,
      });
      expect(refreshResponse.status).toBe(200);
      const refreshData = refreshResponse.data.data || refreshResponse.data;
      const newAccessToken = refreshData.accessToken;
      const newRefreshToken = refreshData.refreshToken;

      // Step 6: Verify new tokens work
      const newProfileResponse = await api.get('/auth/me', {
        headers: getAuthHeaders(newAccessToken),
      });
      expect(newProfileResponse.status).toBe(200);

      // Step 7: Logout
      const logoutResponse = await api.post(
        '/auth/logout',
        {},
        { headers: getAuthHeaders(newAccessToken) }
      );
      expect(logoutResponse.status).toBe(200);

      // Step 8: Verify refresh token is invalidated
      const invalidRefreshResponse = await api.post('/auth/refresh', {
        refreshToken: newRefreshToken,
      });
      expect(invalidRefreshResponse.status).toBe(401);
    });
  });
});
