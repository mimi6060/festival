/**
 * Auth E2E Tests with Cookie Support
 *
 * Tests the complete authentication flow using supertest for proper HTTP cookie handling:
 * - POST /auth/register - Create new user
 * - POST /auth/login - Login and receive cookies
 * - GET /auth/me - Get current user with cookie
 * - POST /auth/refresh - Refresh token
 * - POST /auth/logout - Logout and clear cookies
 * - POST /auth/forgot-password - Request password reset
 * - POST /auth/reset-password - Reset password with token
 * - POST /auth/change-password - Change password (authenticated)
 * - POST /auth/verify-email - Verify email with token
 */

import supertest from 'supertest';
import { randomEmail, randomPassword } from '../support';
import { invalidUserData } from '../support/fixtures';

// Create request instance
const request = supertest;

// Get the base URL from environment
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ?? '3333';
const baseUrl = `http://${host}:${port}`;

describe('Auth E2E Tests with Cookie Support', () => {
  // ============================================================================
  // POST /api/auth/register
  // ============================================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should register with optional phone number', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
          phone: '+33612345678',
        })
        .expect(201);

      expect(response.body.user.email).toBe(email);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.missingEmail)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.missingPassword)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.invalidEmail)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.weakPassword)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for empty firstName', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.emptyFirstName)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for empty lastName', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send(invalidUserData.emptyLastName)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 409 for duplicate email', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // First registration
      await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      // Second registration with same email
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Another',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body).toHaveProperty('message');
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const email = randomEmail().toUpperCase();
      const password = randomPassword();

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email: `  ${email}  `,
          password,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.user.email).toBe(email.toLowerCase());
    });
  });

  // ============================================================================
  // POST /api/auth/login
  // ============================================================================
  describe('POST /api/auth/login', () => {
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      testPassword = randomPassword();

      await request(baseUrl).post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    it('should login successfully and set cookies', async () => {
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

      // Check that cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies) ? cookies : [cookies]).toEqual(
        expect.arrayContaining([
          expect.stringContaining('access_token='),
          expect.stringContaining('refresh_token='),
        ])
      );
    });

    it('should set httpOnly cookies', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

      // Check that cookies are httpOnly
      cookieArray.forEach((cookie: string) => {
        if (cookie.includes('access_token=') || cookie.includes('refresh_token=')) {
          expect(cookie.toLowerCase()).toContain('httponly');
        }
      });
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.festival',
          password: testPassword,
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          password: testPassword,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return JWT tokens with correct format', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      // JWT tokens should have 3 parts separated by dots
      const accessTokenParts = response.body.tokens.accessToken.split('.');
      const refreshTokenParts = response.body.tokens.refreshToken.split('.');

      expect(accessTokenParts.length).toBe(3);
      expect(refreshTokenParts.length).toBe(3);
    });
  });

  // ============================================================================
  // GET /api/auth/me
  // ============================================================================
  describe('GET /api/auth/me', () => {
    let accessToken: string;
    let cookies: string[];
    let testEmail: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      const testPassword = randomPassword();

      const registerResponse = await request(baseUrl).post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Me',
        lastName: 'Test',
      });

      accessToken = registerResponse.body.tokens.accessToken;
      const rawCookies = registerResponse.headers['set-cookie'];
      cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    });

    it('should return current user info with Bearer token', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).toHaveProperty('firstName', 'Me');
      expect(response.body).toHaveProperty('lastName', 'Test');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return current user info with cookie authentication', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      await request(baseUrl).get('/api/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 401 with malformed token', async () => {
      await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.invalid')
        .expect(401);
    });

    it('should not expose sensitive fields in response', async () => {
      const response = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });

  // ============================================================================
  // POST /api/auth/refresh
  // ============================================================================
  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;
    let cookies: string[];

    beforeAll(async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await request(baseUrl).post('/api/auth/register').send({
        email,
        password,
        firstName: 'Refresh',
        lastName: 'Test',
      });

      accessToken = registerResponse.body.tokens.accessToken;
      refreshToken = registerResponse.body.tokens.refreshToken;
      const rawCookies = registerResponse.headers['set-cookie'];
      cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    });

    it('should refresh access token with body refreshToken', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('should refresh access token using cookie', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should set new cookies after refresh', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newCookies = response.headers['set-cookie'];
      expect(newCookies).toBeDefined();
    });

    it('should return 400 for missing refresh token', async () => {
      await request(baseUrl).post('/api/auth/refresh').send({}).expect(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);
    });

    it('should prefer body token over cookie token', async () => {
      // This test verifies that if both body and cookie contain a refresh token,
      // the body token takes precedence
      const response = await request(baseUrl)
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=old.invalid.token'])
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });

  // ============================================================================
  // POST /api/auth/logout
  // ============================================================================
  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;
    let cookies: string[];

    beforeEach(async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await request(baseUrl).post('/api/auth/register').send({
        email,
        password,
        firstName: 'Logout',
        lastName: 'Test',
      });

      accessToken = registerResponse.body.tokens.accessToken;
      refreshToken = registerResponse.body.tokens.refreshToken;
      const rawCookies = registerResponse.headers['set-cookie'];
      cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
    });

    it('should logout successfully with Bearer token', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should logout successfully with cookie authentication', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should clear cookies on logout', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const logoutCookies = response.headers['set-cookie'];
      if (logoutCookies) {
        const cookieArray = Array.isArray(logoutCookies) ? logoutCookies : [logoutCookies];
        // Cookies should be cleared (empty or expired)
        cookieArray.forEach((cookie: string) => {
          if (cookie.includes('access_token') || cookie.includes('refresh_token')) {
            // Cookie should either be empty or have past expiration
            expect(
              cookie.includes('access_token=;') ||
                cookie.includes('refresh_token=;') ||
                cookie.includes('Expires=Thu, 01 Jan 1970') ||
                cookie.includes('Max-Age=0')
            ).toBe(true);
          }
        });
      }
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout
      await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Try to use refresh token - should fail
      const response = await request(baseUrl).post('/api/auth/refresh').send({ refreshToken });

      expect([401, 403]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      await request(baseUrl).post('/api/auth/logout').expect(401);
    });
  });

  // ============================================================================
  // POST /api/auth/forgot-password
  // ============================================================================
  describe('POST /api/auth/forgot-password', () => {
    let testEmail: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      const testPassword = randomPassword();

      await request(baseUrl).post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Forgot',
        lastName: 'Password',
      });
    });

    it('should accept valid email for password reset', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      // Should return success regardless of whether email exists (security)
      expect([200, 202]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return same response for non-existent email (prevents enumeration)', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.festival' });

      // Same status as existing email to prevent enumeration
      expect([200, 202]).toContain(response.status);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 for missing email', async () => {
      await request(baseUrl).post('/api/auth/forgot-password').send({}).expect(400);
    });

    it('should return 400 for invalid email format', async () => {
      await request(baseUrl)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should normalize email before processing', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/forgot-password')
        .send({ email: `  ${testEmail.toUpperCase()}  ` });

      expect([200, 202]).toContain(response.status);
    });
  });

  // ============================================================================
  // POST /api/auth/reset-password
  // ============================================================================
  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for missing token', async () => {
      await request(baseUrl)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'NewPassword123!' })
        .expect(400);
    });

    it('should return 400 for missing password', async () => {
      await request(baseUrl)
        .post('/api/auth/reset-password')
        .send({ token: 'some-reset-token' })
        .expect(400);
    });

    it('should return 401 for invalid/expired token', async () => {
      const response = await request(baseUrl).post('/api/auth/reset-password').send({
        token: 'invalid-reset-token',
        newPassword: 'NewPassword123!',
      });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 for weak new password', async () => {
      await request(baseUrl)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: '123', // Too weak
        })
        .expect(400);
    });

    it('should validate password strength requirements', async () => {
      // Password without uppercase
      let response = await request(baseUrl).post('/api/auth/reset-password').send({
        token: 'some-token',
        newPassword: 'lowercase123!',
      });
      expect(response.status).toBe(400);

      // Password without number
      response = await request(baseUrl).post('/api/auth/reset-password').send({
        token: 'some-token',
        newPassword: 'NoNumberHere!',
      });
      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/auth/change-password
  // ============================================================================
  describe('POST /api/auth/change-password', () => {
    let accessToken: string;
    let testEmail: string;
    let testPassword: string;

    beforeAll(async () => {
      testEmail = randomEmail();
      testPassword = randomPassword();

      const registerResponse = await request(baseUrl).post('/api/auth/register').send({
        email: testEmail,
        password: testPassword,
        firstName: 'Change',
        lastName: 'Password',
      });

      accessToken = registerResponse.body.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const newPassword = randomPassword();

      const response = await request(baseUrl)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Should be able to login with new password
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
    });

    it('should return 401 for wrong current password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: randomPassword(),
        });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      await request(baseUrl)
        .post('/api/auth/change-password')
        .send({
          currentPassword: testPassword,
          newPassword: randomPassword(),
        })
        .expect(401);
    });

    it('should return 400 for weak new password', async () => {
      await request(baseUrl)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: '123',
        })
        .expect(400);
    });
  });

  // ============================================================================
  // POST /api/auth/verify-email
  // ============================================================================
  describe('POST /api/auth/verify-email', () => {
    it('should return 400 for missing token', async () => {
      await request(baseUrl).post('/api/auth/verify-email').send({}).expect(400);
    });

    it('should return error for invalid token', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-verification-token' });

      expect([400, 401]).toContain(response.status);
    });
  });

  // ============================================================================
  // POST /api/auth/resend-verification
  // ============================================================================
  describe('POST /api/auth/resend-verification', () => {
    it('should accept resend request for registered email', async () => {
      const email = randomEmail();
      const password = randomPassword();

      await request(baseUrl).post('/api/auth/register').send({
        email,
        password,
        firstName: 'Resend',
        lastName: 'Test',
      });

      const response = await request(baseUrl).post('/api/auth/resend-verification').send({ email });

      expect([200, 202]).toContain(response.status);
    });

    it('should return 400 for missing email', async () => {
      await request(baseUrl).post('/api/auth/resend-verification').send({}).expect(400);
    });
  });

  // ============================================================================
  // GET /api/auth/providers
  // ============================================================================
  describe('GET /api/auth/providers', () => {
    it('should return list of OAuth providers', async () => {
      const response = await request(baseUrl).get('/api/auth/providers').expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(Array.isArray(response.body.providers)).toBe(true);

      // Should have at least google and github providers
      const providerNames = response.body.providers.map((p: { name: string }) => p.name);
      expect(providerNames).toContain('google');
      expect(providerNames).toContain('github');
    });

    it('should include enabled status and URL for each provider', async () => {
      const response = await request(baseUrl).get('/api/auth/providers').expect(200);

      response.body.providers.forEach(
        (provider: { name: string; enabled: boolean; url: string }) => {
          expect(provider).toHaveProperty('name');
          expect(provider).toHaveProperty('enabled');
          expect(typeof provider.enabled).toBe('boolean');
          expect(provider).toHaveProperty('url');
        }
      );
    });
  });

  // ============================================================================
  // Complete Auth Flow Integration Test
  // ============================================================================
  describe('Complete Auth Flow Integration', () => {
    it('should complete full auth lifecycle with cookies', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // 1. Register
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Flow',
          lastName: 'Test',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body).toHaveProperty('tokens');

      const accessToken = registerResponse.body.tokens.accessToken;
      const refreshToken = registerResponse.body.tokens.refreshToken;
      const rawCookies = registerResponse.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

      // 2. Access protected route with Bearer token
      const meResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.email).toBe(email);

      // 3. Access protected route with cookie
      const meCookieResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(meCookieResponse.body.email).toBe(email);

      // 4. Refresh token
      const refreshResponse = await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;
      expect(newAccessToken).not.toBe(accessToken);

      // 5. Access protected route with new token
      await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // 6. Logout
      const logoutResponse = await request(baseUrl)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 7. Verify refresh token is invalidated
      const invalidRefreshResponse = await request(baseUrl)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect([401, 403]).toContain(invalidRefreshResponse.status);

      // 8. Login again
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
    });

    it('should maintain session with cookie-based authentication', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register and get cookies
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Cookie',
          lastName: 'Session',
        })
        .expect(201);

      const rawCookies = registerResponse.headers['set-cookie'];
      let cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

      // Make multiple requests with cookies
      for (let i = 0; i < 3; i++) {
        const response = await request(baseUrl)
          .get('/api/auth/me')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.email).toBe(email);
      }

      // Refresh using cookies
      const refreshResponse = await request(baseUrl)
        .post('/api/auth/refresh')
        .set('Cookie', cookies)
        .send({})
        .expect(200);

      // Get new cookies from refresh
      const newRawCookies = refreshResponse.headers['set-cookie'];
      if (newRawCookies) {
        cookies = Array.isArray(newRawCookies) ? newRawCookies : [newRawCookies];
      }

      // Continue with new cookies
      await request(baseUrl).get('/api/auth/me').set('Cookie', cookies).expect(200);
    });
  });

  // ============================================================================
  // Security Tests
  // ============================================================================
  describe('Security Tests', () => {
    it('should not expose password hash in any response', async () => {
      const email = randomEmail();
      const password = randomPassword();

      // Register
      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Security',
          lastName: 'Test',
        })
        .expect(201);

      expect(registerResponse.body.user).not.toHaveProperty('passwordHash');
      expect(registerResponse.body.user).not.toHaveProperty('password');

      // Login
      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body.user).not.toHaveProperty('passwordHash');
      expect(loginResponse.body.user).not.toHaveProperty('password');

      // Get me
      const meResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(meResponse.body).not.toHaveProperty('passwordHash');
      expect(meResponse.body).not.toHaveProperty('password');
    });

    it('should not expose refresh token in user object', async () => {
      const email = randomEmail();
      const password = randomPassword();

      const registerResponse = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Security',
          lastName: 'Test',
        })
        .expect(201);

      expect(registerResponse.body.user).not.toHaveProperty('refreshToken');

      const meResponse = await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerResponse.body.tokens.accessToken}`)
        .expect(200);

      expect(meResponse.body).not.toHaveProperty('refreshToken');
    });

    it('should reject requests with invalid Authorization header format', async () => {
      // No "Bearer " prefix
      await request(baseUrl).get('/api/auth/me').set('Authorization', 'invalidtoken').expect(401);

      // Wrong prefix
      await request(baseUrl)
        .get('/api/auth/me')
        .set('Authorization', 'Basic sometoken')
        .expect(401);
    });

    it('should be timing-safe against password brute force', async () => {
      const email = randomEmail();
      const password = randomPassword();

      await request(baseUrl).post('/api/auth/register').send({
        email,
        password,
        firstName: 'Timing',
        lastName: 'Test',
      });

      // Measure time for multiple wrong password attempts
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(baseUrl)
          .post('/api/auth/login')
          .send({
            email,
            password: 'WrongPassword' + i + '!',
          });
        times.push(Date.now() - start);
      }

      // Calculate variance
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, t) => acc + Math.pow(t - avgTime, 2), 0) / times.length;

      // Variance should be relatively low for timing-safe comparison
      // High variance would indicate potential timing attack vulnerability
      expect(variance).toBeLessThan(10000);
    });
  });
});
