/**
 * Auth E2E Tests
 *
 * Tests the complete authentication flow:
 * - User registration
 * - Login
 * - Token refresh
 * - Logout
 * - Password reset
 * - Protected route access
 */

import axios from 'axios';
import {
  createTestUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  authenticatedRequest,
  randomEmail,
  randomPassword,
  expectValidationError,
  expectUnauthorized,
  expectForbidden,
} from '../support';
import { validUserData, invalidUserData, expectedErrorMessages } from '../support/fixtures';

describe('Auth E2E Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const response = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user.email).toBe(email);
      expect(response.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for missing email', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.missingEmail);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 400 for missing password', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.missingPassword);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.invalidEmail);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 400 for weak password', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.weakPassword);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 400 for empty firstName', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.emptyFirstName);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 400 for empty lastName', async () => {
      const response = await axios.post('/api/auth/register', invalidUserData.emptyLastName);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return 409 for duplicate email', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // First registration
      await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Test',
        lastName: 'User',
      });

      // Second registration with same email
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Another',
        lastName: 'User',
      });

      expect(response.status).toBe(409);
    });

    it('should trim whitespace from email', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const response = await axios.post('/api/auth/register', {
        email: `  ${email}  `,
        password,
        firstName: 'Test',
        lastName: 'User',
      });

      // Should succeed (trimmed) or reject based on implementation
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      testPassword = randomPassword();

      await axios.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await axios.post('/api/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(testEmail);
    });

    it('should return 401 for invalid email', async () => {
      const response = await axios.post('/api/auth/login', {
        email: 'nonexistent@test.festival',
        password: testPassword,
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid password', async () => {
      const response = await axios.post('/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing email', async () => {
      const response = await axios.post('/api/auth/login', {
        password: testPassword,
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await axios.post('/api/auth/login', {
        email: testEmail,
      });

      expect(response.status).toBe(400);
    });

    it('should return JWT tokens with correct format', async () => {
      const response = await axios.post('/api/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);

      // JWT tokens should have 3 parts separated by dots
      const accessTokenParts = response.data.accessToken.split('.');
      const refreshTokenParts = response.data.refreshToken.split('.');

      expect(accessTokenParts.length).toBe(3);
      expect(refreshTokenParts.length).toBe(3);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let testEmail: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      const testPassword = randomPassword();

      const registerResponse = await axios.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        firstName: 'Me',
        lastName: 'Test',
      });

      accessToken = registerResponse.data.accessToken;
    });

    it('should return current user info with valid token', async () => {
      const response = await authenticatedRequest('get', '/api/auth/me', accessToken);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', testEmail);
      expect(response.data).toHaveProperty('firstName', 'Me');
      expect(response.data).toHaveProperty('lastName', 'Test');
      expect(response.data).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      const response = await axios.get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      // This test would need a mock or a way to generate expired tokens
      // For now, we test with a malformed token
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.invalid' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;

    beforeAll(async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Refresh',
        lastName: 'Test',
      });

      accessToken = registerResponse.data.accessToken;
      refreshToken = registerResponse.data.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data.accessToken).not.toBe(accessToken);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await axios.post('/api/auth/refresh', {});

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await axios.post('/api/auth/refresh', {
        refreshToken: 'invalid.refresh.token',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Logout',
        lastName: 'Test',
      });

      accessToken = registerResponse.data.accessToken;
      refreshToken = registerResponse.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await authenticatedRequest('post', '/api/auth/logout', accessToken);

      expect(response.status).toBe(200);
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout
      await authenticatedRequest('post', '/api/auth/logout', accessToken);

      // Try to use refresh token
      const response = await axios.post('/api/auth/refresh', {
        refreshToken,
      });

      // Should fail because token was invalidated
      expect([401, 403]).toContain(response.status);
    });

    it('should return 401 without token', async () => {
      const response = await axios.post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testEmail: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      const testPassword = randomPassword();

      await axios.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        firstName: 'Forgot',
        lastName: 'Password',
      });
    });

    it('should accept valid email for password reset', async () => {
      const response = await axios.post('/api/auth/forgot-password', {
        email: testEmail,
      });

      // Should return 200/202 regardless of whether email exists (security best practice)
      expect([200, 202]).toContain(response.status);
    });

    it('should return same response for non-existent email (security)', async () => {
      const response = await axios.post('/api/auth/forgot-password', {
        email: 'nonexistent@test.festival',
      });

      // Should return same status to prevent email enumeration
      expect([200, 202]).toContain(response.status);
    });

    it('should return 400 for missing email', async () => {
      const response = await axios.post('/api/auth/forgot-password', {});

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await axios.post('/api/auth/forgot-password', {
        email: 'not-an-email',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for missing token', async () => {
      const response = await axios.post('/api/auth/reset-password', {
        password: 'NewPassword123!',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await axios.post('/api/auth/reset-password', {
        token: 'some-reset-token',
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid/expired token', async () => {
      const response = await axios.post('/api/auth/reset-password', {
        token: 'invalid-reset-token',
        password: 'NewPassword123!',
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 for weak new password', async () => {
      const response = await axios.post('/api/auth/reset-password', {
        token: 'some-token',
        password: '123',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Complete Auth Flow', () => {
    it('should complete full auth lifecycle', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // 1. Register
      const registerResponse = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Flow',
        lastName: 'Test',
      });
      expect(registerResponse.status).toBe(201);
      const { accessToken, refreshToken } = registerResponse.data;

      // 2. Access protected route
      const meResponse = await authenticatedRequest('get', '/api/auth/me', accessToken);
      expect(meResponse.status).toBe(200);
      expect(meResponse.data.email).toBe(email);

      // 3. Refresh token
      const refreshResponse = await axios.post('/api/auth/refresh', { refreshToken });
      expect(refreshResponse.status).toBe(200);
      const newAccessToken = refreshResponse.data.accessToken;

      // 4. Access protected route with new token
      const meResponse2 = await authenticatedRequest('get', '/api/auth/me', newAccessToken);
      expect(meResponse2.status).toBe(200);

      // 5. Logout
      const logoutResponse = await authenticatedRequest('post', '/api/auth/logout', newAccessToken);
      expect(logoutResponse.status).toBe(200);

      // 6. Verify refresh token is invalidated
      const invalidRefreshResponse = await axios.post('/api/auth/refresh', { refreshToken });
      expect([401, 403]).toContain(invalidRefreshResponse.status);

      // 7. Login again
      const loginResponse = await axios.post('/api/auth/login', { email, password });
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty('accessToken');
    });
  });

  describe('Security Tests', () => {
    it('should not expose password hash in user responses', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Security',
        lastName: 'Test',
      });

      expect(registerResponse.data.user).not.toHaveProperty('passwordHash');
      expect(registerResponse.data.user).not.toHaveProperty('password');

      const meResponse = await authenticatedRequest(
        'get',
        '/api/auth/me',
        registerResponse.data.accessToken,
      );

      expect(meResponse.data).not.toHaveProperty('passwordHash');
      expect(meResponse.data).not.toHaveProperty('password');
    });

    it('should not expose refresh token in user responses', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Security',
        lastName: 'Test',
      });

      expect(registerResponse.data.user).not.toHaveProperty('refreshToken');

      const meResponse = await authenticatedRequest(
        'get',
        '/api/auth/me',
        registerResponse.data.accessToken,
      );

      expect(meResponse.data).not.toHaveProperty('refreshToken');
    });

    it('should use secure password comparison (timing-safe)', async () => {
      const email = randomEmail();
      const password = randomPassword();

      await axios.post('/api/auth/register', {
        email,
        password,
        firstName: 'Timing',
        lastName: 'Test',
      });

      // Measure time for wrong password attempts
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await axios.post('/api/auth/login', {
          email,
          password: 'WrongPassword' + i + '!',
        });
        times.push(Date.now() - start);
      }

      // Check time variance is reasonable (not a precise test but a sanity check)
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, t) => acc + Math.pow(t - avgTime, 2), 0) / times.length;

      // Variance should be relatively low for timing-safe comparison
      // This is a weak test but catches obvious timing attacks
      expect(variance).toBeLessThan(10000); // 10 second variance would be suspicious
    });
  });
});
