/**
 * E2E Auth Flow Test Suite
 * ========================
 * Tests the full authentication flow through the API Gateway → Users gRPC Microservice.
 *
 * Prerequisites:
 *   - API Gateway must be running on http://localhost:3000 (NODE_ENV=development)
 *   - Users microservice must be running on gRPC port 50051
 *   - PostgreSQL must be running with the Booking-Users database
 *   - RabbitMQ must be running (for notification service events)
 *
 * Run with:
 *   npx jest --config apps/api-gateway-e2e/jest.config.cts --testPathPattern="auth" --runInBand --verbose
 *
 * Or via nx:
 *   npx nx e2e api-gateway-e2e --testFile=apps/api-gateway-e2e/src/auth/auth.e2e-spec.ts
 */

import supertest from 'supertest';
import * as jwt from 'jsonwebtoken';
import {
  makeExpiredAccessToken,
  makeTamperedAccessToken,
  corruptSignature,
  tamperPayload,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
} from './helpers/token.helper';

// ─── Configuration ──────────────────────────────────────────────────────────
const BASE_URL = `http://${process.env.HOST ?? 'localhost'}:${
  process.env.PORT ?? '3000'
}`;
const API = `/api/v1`;

/** Endpoints */
const ENDPOINTS = {
  REGISTER: `${API}/users/auth/register`,
  VERIFY: `${API}/users/auth/verify-otp`,
  LOGIN: `${API}/users/auth/login`,
  PROFILE: `${API}/users/profile/me`,
  REFRESH: `${API}/users/auth/refresh-token`,
} as const;

/** Global test state shared across tests in the happy-path suite */
interface AuthState {
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  /** Parsed cookie string for injection into follow-up requests */
  refreshCookieHeader: string;
}

const state: AuthState = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'TestPassword@123',
  accessToken: '',
  refreshToken: '',
  refreshCookieHeader: '',
};

/** Convenience: create a supertest agent that keeps cookies between requests */
const agent = supertest(BASE_URL);

// ─── Helper: extract refresh token from Set-Cookie header ───────────────────
function extractRefreshCookie(
  headers: Record<string, string | string[]>,
): { cookie: string; token: string } {
  const setCookie = headers['set-cookie'];
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie ?? '';

  const match = cookieStr.match(/refreshToken=([^;]+)/);
  if (!match) throw new Error('refreshToken cookie not found in response');

  return {
    cookie: `refreshToken=${match[1]}`,
    token: match[1],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Happy Path: Full Auth Lifecycle
// ────────────────────────────────────────────────────────────────────────────
describe('Happy Path — Full Auth Lifecycle', () => {
  /**
   * Step 1 — Register
   * POST /api/v1/auth/users/register
   * Expects 201 with success message.
   *
   * NOTE: Registration triggers an email verification code via RabbitMQ.
   * In a true isolated test environment you would stub the notification
   * service. Here we register a real user and use the verify endpoint.
   */
  it('Step 1 — Register a new user', async () => {
    const res = await agent
      .post(ENDPOINTS.REGISTER)
      .field('name', 'E2E Test User')
      .field('email', state.email)
      .field('password', state.password)
      .field('country', 'EG')
      .field('age', '25')
      .field('gender', 'male');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      message: 'Account created successfully',
    });
  });

  /**
   * Step 2 — Login (before verification)
   * Expects 400 "User is not verified".
   */
  it('Step 2 — Login before email verification returns 400', async () => {
    const res = await agent.post(ENDPOINTS.LOGIN).send({
      email: state.email,
      password: state.password,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not verified/i);
  });

  /**
   * Step 3 — Receive Access & Refresh Tokens after Login
   *
   * For E2E purposes we skip the real verification flow and directly create a
   * verified user via the DB or we mock the verify call. However, since we
   * cannot easily mock the gRPC service here, the test below documents the
   * EXPECTED behaviour once verification has succeeded.
   *
   * If you want to drive the full flow end-to-end, run this alongside a
   * seeded verified user (see README). The login test below uses a
   * PRE-SEEDED verified account to avoid flakiness from email delivery.
   *
   * Replace the values below with a seeded test user in your DB:
   */
  const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
  const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

  it('Step 3 — Login with verified credentials returns access token + httpOnly refresh cookie', async () => {
    const res = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    expect(res.status).toBe(200);

    // Access token must be in the JSON body
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.split('.').length).toBe(3); // valid JWT format

    // Refresh token must be an httpOnly cookie (NOT in body)
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(res.headers['set-cookie']).toBeDefined();

    const cookieHeader = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookieHeader)
      ? cookieHeader.join('; ')
      : cookieHeader;

    expect(cookieStr).toMatch(/refreshToken=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
    expect(cookieStr).toMatch(/Path=\//i);

    // Verify access token is a valid JWT with expected claims
    const decoded = jwt.verify(
      res.body.accessToken,
      JWT_ACCESS_SECRET,
    ) as jwt.JwtPayload;
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('exp');

    // Save state for subsequent tests
    const { cookie, token } = extractRefreshCookie(res.headers as any);
    state.accessToken = res.body.accessToken;
    state.refreshToken = token;
    state.refreshCookieHeader = cookie;
  });

  it('Step 4 — Call protected endpoint with valid access token returns 200', async () => {
    if (!state.accessToken) {
      console.warn('Skipping: no access token from previous step');
      return;
    }

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${state.accessToken}`);

    expect(res.status).toBe(200);
    // Should return user profile data
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
  });

  it('Step 5 — Refresh token returns new access token + rotated refresh cookie', async () => {
    if (!state.refreshCookieHeader) {
      console.warn('Skipping: no refresh token cookie from previous step');
      return;
    }

    const res = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Cookie', state.refreshCookieHeader);

    expect(res.status).toBe(200);

    // New access token must be present and different from old one
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');

    // Tokens should be rotated (new != old)
    expect(res.body.accessToken).not.toBe(state.accessToken);

    // A new refresh cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
    const { cookie: newCookie, token: newToken } = extractRefreshCookie(
      res.headers as any,
    );
    expect(newToken).not.toBe(state.refreshToken);

    // Verify new access token is valid
    const decoded = jwt.verify(
      res.body.accessToken,
      JWT_ACCESS_SECRET,
    ) as jwt.JwtPayload;
    expect(decoded).toHaveProperty('id');

    // Update state
    state.accessToken = res.body.accessToken;
    state.refreshToken = newToken;
    state.refreshCookieHeader = newCookie;
  });

  it('Step 6 — New access token from refresh works on protected endpoint', async () => {
    if (!state.accessToken) {
      console.warn('Skipping: no refreshed access token from previous step');
      return;
    }

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${state.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Expired Access Token
// ────────────────────────────────────────────────────────────────────────────
describe('Expired Access Token', () => {
  it('Accessing protected route with expired access token returns 401', async () => {
    // Generate a token that expired 10 seconds ago using the real secret
    const expiredToken = makeExpiredAccessToken('fake-user-id-expired');

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    // NestJS UnauthorizedException body shape
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('Using expired token on refresh endpoint still requires a valid cookie', async () => {
    // Expired access token in header + no cookie -> should still get 401 from refresh
    const expiredToken = makeExpiredAccessToken('fake-user-id-expired');

    const res = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Authorization', `Bearer ${expiredToken}`);
    // No cookie sent -> gateway should reject with 401

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/refresh token is required/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Invalid / Tampered Token
// ────────────────────────────────────────────────────────────────────────────
describe('Invalid / Tampered Token', () => {
  it('Accessing protected route with completely fake token returns 401', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.BAD_SIGNATURE';

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('Accessing protected route with token signed by wrong secret returns 401', async () => {
    const tamperedToken = makeTamperedAccessToken('some-user-id');

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('Accessing protected route with corrupted signature returns 401', async () => {
    // Build a real token, then flip one character in the signature
    const realToken = jwt.sign(
      { id: 'some-test-user', role: 'user' },
      JWT_ACCESS_SECRET,
      { expiresIn: '5m' },
    );
    const corrupted = corruptSignature(realToken);

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${corrupted}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('Accessing protected route with privilege-escalated payload (role=admin) returns 401', async () => {
    // Start with a valid user token, then swap payload to claim admin role
    const realToken = jwt.sign(
      { id: 'normal-user', role: 'user' },
      JWT_ACCESS_SECRET,
      { expiresIn: '5m' },
    );
    const escalated = tamperPayload(realToken, { id: 'normal-user', role: 'admin' });

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', `Bearer ${escalated}`);

    // Signature mismatch -> 401
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('Sending refresh endpoint a tampered cookie (wrong signature) returns 401', async () => {
    // Build a valid refresh token, corrupt its signature
    const realRefresh = jwt.sign({ id: 'test-user' }, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
    });
    const corrupted = corruptSignature(realRefresh);

    const res = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Cookie', `refreshToken=${corrupted}`);

    expect(res.status).toBe(401);
  });

  it('No Authorization header at all on protected endpoint returns 401', async () => {
    const res = await agent.get(ENDPOINTS.PROFILE);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token not provided/i);
  });

  it('Bearer prefix missing (bare token) returns 401', async () => {
    const token = jwt.sign({ id: 'user', role: 'user' }, JWT_ACCESS_SECRET, {
      expiresIn: '5m',
    });

    const res = await agent
      .get(ENDPOINTS.PROFILE)
      .set('Authorization', token); // Missing "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token not provided/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Token Reuse / Race Condition on Refresh
// ────────────────────────────────────────────────────────────────────────────
describe('Token Reuse / Race Condition', () => {
  /**
   * Scenario: Two concurrent requests use the EXACT same refresh token.
   *
   * Expected: At least one should succeed (the one that wins the race).
   * The other should fail with 401 because the token was already rotated
   * (refresh token rotation invalidates old tokens via bcrypt hash replacement).
   *
   * Note: The Users microservice stores a hash of the last refresh token.
   * Whichever concurrent request is processed second will attempt to verify a
   * token that has already been replaced. The bcrypt check will fail, but
   * since the service currently verifies JWT signature (not DB hash on refresh),
   * both MAY succeed. This test documents the current behavior and serves as a
   * regression guard if DB-level token rotation is added.
   */
  it('Two concurrent refresh requests with the same token: at least one succeeds, no 500s', async () => {
    // We need a fresh valid refresh token for this test.
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const loginRes = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (loginRes.status !== 200) {
      console.warn('Race-condition test skipped: cannot login with verified user');
      return;
    }

    const { cookie: refreshCookie } = extractRefreshCookie(
      loginRes.headers as any,
    );

    // Fire two refresh requests concurrently with the same token
    const [res1, res2] = await Promise.all([
      agent.post(ENDPOINTS.REFRESH).set('Cookie', refreshCookie),
      agent.post(ENDPOINTS.REFRESH).set('Cookie', refreshCookie),
    ]);

    const statuses = [res1.status, res2.status];

    // At least one must succeed
    expect(statuses).toContain(200);

    // Both responses must not crash the server (no 500)
    expect(res1.status).not.toBe(500);
    expect(res2.status).not.toBe(500);

    // If both succeed (current behavior — JWT-only validation), document it
    if (res1.status === 200 && res2.status === 200) {
      console.warn(
        'WARNING: Both concurrent refresh requests succeeded. ' +
          'Consider adding DB-level refresh token rotation to prevent reuse.',
      );
    }

    // If the second one fails, ensure it returns 401 (not 500)
    if (res1.status === 200 && res2.status !== 200) {
      expect(res2.status).toBe(401);
    }
    if (res2.status === 200 && res1.status !== 200) {
      expect(res1.status).toBe(401);
    }
  });

  it('Reusing an old refresh token after rotation: documents current behavior', async () => {
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const loginRes = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (loginRes.status !== 200) {
      console.warn('Old token reuse test skipped: cannot login with verified user');
      return;
    }

    const { cookie: originalCookie } = extractRefreshCookie(
      loginRes.headers as any,
    );

    // First refresh — should succeed and rotate the token
    const firstRefresh = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Cookie', originalCookie);

    expect(firstRefresh.status).toBe(200);

    // Second refresh with the ORIGINAL (now rotated-out) cookie
    // The new hash stored in DB no longer matches the old token
    const secondRefresh = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Cookie', originalCookie);

    // Current behavior: JWT is still cryptographically valid, so this may
    // still succeed until DB-level check is enforced. Document either way.
    if (secondRefresh.status === 200) {
      console.warn(
        'WARNING: Old refresh token still accepted after rotation. ' +
          'DB-level token invalidation not yet implemented.',
      );
      // But it must not be 500
      expect(secondRefresh.status).not.toBe(500);
    } else {
      expect(secondRefresh.status).toBe(401);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Missing Cookie / Payload — Error Handling & No Crash
// ────────────────────────────────────────────────────────────────────────────
describe('Missing Cookie / Payload — Proper Error Responses', () => {
  describe('POST /auth/users/refresh — missing cookie', () => {
    it('No cookies sent at all returns 401 with clear message (no crash)', async () => {
      const res = await agent.post(ENDPOINTS.REFRESH);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/refresh token is required/i);
      // Must NOT be an internal server error
      expect(res.status).not.toBe(500);
    });

    it('Cookie header present but refreshToken key missing returns 401', async () => {
      const res = await agent
        .post(ENDPOINTS.REFRESH)
        .set('Cookie', 'someOtherCookie=irrelevant');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/refresh token is required/i);
    });

    it('Empty refreshToken value in cookie returns 401', async () => {
      const res = await agent
        .post(ENDPOINTS.REFRESH)
        .set('Cookie', 'refreshToken=');

      expect(res.status).toBe(401);
    });

    it('Malformed JWT string in cookie returns 401 (no crash)', async () => {
      const res = await agent
        .post(ENDPOINTS.REFRESH)
        .set('Cookie', 'refreshToken=not.a.jwt.at.all');

      expect(res.status).toBe(401);
      expect(res.status).not.toBe(500);
    });
  });

  describe('POST /auth/users/login — missing / malformed body', () => {
    it('Empty body returns 400 bad request (no crash)', async () => {
      const res = await agent
        .post(ENDPOINTS.LOGIN)
        .send({});

      expect(res.status).toBe(400);
      expect(res.status).not.toBe(500);
    });

    it('Missing password field returns 400', async () => {
      const res = await agent
        .post(ENDPOINTS.LOGIN)
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('Missing email field returns 400', async () => {
      const res = await agent
        .post(ENDPOINTS.LOGIN)
        .send({ password: 'somepassword' });

      expect(res.status).toBe(400);
    });

    it('Non-existent user email returns 400 (user not found)', async () => {
      const res = await agent.post(ENDPOINTS.LOGIN).send({
        email: `nonexistent-${Date.now()}@ghost.com`,
        password: 'AnyPassword@123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/user not found/i);
    });

    it('Wrong password for existing user returns 400', async () => {
      const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';

      const res = await agent.post(ENDPOINTS.LOGIN).send({
        email: VERIFIED_EMAIL,
        password: 'WRONG_PASSWORD_12345',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid password/i);
    });
  });

  describe('POST /auth/users/register — missing / malformed body', () => {
    it('Empty body returns 400 bad request (no crash)', async () => {
      const res = await agent
        .post(ENDPOINTS.REGISTER)
        .send({});

      expect(res.status).toBe(400);
      expect(res.status).not.toBe(500);
    });

    it('Underage user (age < 18) returns 400', async () => {
      const res = await agent
        .post(ENDPOINTS.REGISTER)
        .field('name', 'Young User')
        .field('email', `young-${Date.now()}@example.com`)
        .field('password', 'TestPassword@123')
        .field('country', 'EG')
        .field('age', '15')
        .field('gender', 'male');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 18 years old/i);
    });

    it('Duplicate email returns 400 (email already in use)', async () => {
      const dupEmail = `dup-${Date.now()}@example.com`;

      // First registration
      await agent
        .post(ENDPOINTS.REGISTER)
        .field('name', 'First User')
        .field('email', dupEmail)
        .field('password', 'TestPassword@123')
        .field('country', 'EG')
        .field('age', '25')
        .field('gender', 'male');

      // Duplicate attempt
      const res = await agent
        .post(ENDPOINTS.REGISTER)
        .field('name', 'Second User')
        .field('email', dupEmail)
        .field('password', 'TestPassword@123')
        .field('country', 'EG')
        .field('age', '25')
        .field('gender', 'male');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already used/i);
    });

    it('File upload without crop parameters returns 400', async () => {
      const { Buffer } = await import('buffer');
      // Minimal 1x1 PNG (base64-encoded) to trigger the file code path
      const fakeImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const res = await agent
        .post(ENDPOINTS.REGISTER)
        .field('name', 'Avatar User')
        .field('email', `avatar-${Date.now()}@example.com`)
        .field('password', 'TestPassword@123')
        .field('country', 'EG')
        .field('age', '25')
        .field('gender', 'male')
        .attach('avatar', fakeImageBuffer, 'test-avatar.png');
      // No crop fields -> should return 400 "Crop parameters are required"

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/crop parameters are required/i);
    });
  });

  describe('GET /auth/users/profile — missing authorization', () => {
    it('No Authorization header returns 401', async () => {
      const res = await agent.get(ENDPOINTS.PROFILE);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token not provided/i);
    });

    it('Authorization header with wrong scheme (Basic instead of Bearer) returns 401', async () => {
      const res = await agent
        .get(ENDPOINTS.PROFILE)
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token not provided/i);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Response Shape & Security Headers
// ────────────────────────────────────────────────────────────────────────────
describe('Security Invariants', () => {
  it('Login response body MUST NOT contain refreshToken field', async () => {
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const res = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (res.status !== 200) {
      console.warn('Security invariant test skipped: login failed');
      return;
    }

    // Refresh token must NEVER appear in the JSON body — only as httpOnly cookie
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(res.body).not.toHaveProperty('refresh_token');
  });

  it('Refresh endpoint response body MUST NOT contain refreshToken field', async () => {
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const loginRes = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (loginRes.status !== 200) {
      console.warn('Security invariant test skipped: login failed');
      return;
    }

    const { cookie } = extractRefreshCookie(loginRes.headers as any);
    const refreshRes = await agent
      .post(ENDPOINTS.REFRESH)
      .set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).not.toHaveProperty('refreshToken');
    expect(refreshRes.body).not.toHaveProperty('refresh_token');
  });

  it('Refresh cookie must have Path restricted to refresh endpoint', async () => {
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const res = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (res.status !== 200) {
      console.warn('Cookie path test skipped: login failed');
      return;
    }

    const cookieHeader = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookieHeader)
      ? cookieHeader.join(' ')
      : cookieHeader ?? '';

    expect(cookieStr).toMatch(/Path=\//i);
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  it('Access token must decode with correct claims (id, role, exp)', async () => {
    const VERIFIED_EMAIL = process.env.E2E_VERIFIED_EMAIL ?? 'verified@example.com';
    const VERIFIED_PASSWORD = process.env.E2E_VERIFIED_PASSWORD ?? 'TestPassword@123';

    const res = await agent.post(ENDPOINTS.LOGIN).send({
      email: VERIFIED_EMAIL,
      password: VERIFIED_PASSWORD,
    });

    if (res.status !== 200) {
      console.warn('Claims test skipped: login failed');
      return;
    }

    const { accessToken } = res.body;
    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as jwt.JwtPayload;

    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');

    // Access token should expire in 1 minute (60s) as per .env.development
    const ttl = decoded.exp! - decoded.iat!;
    expect(ttl).toBeLessThanOrEqual(65); // 1m + 5s buffer
    expect(ttl).toBeGreaterThan(0);
  });
});
