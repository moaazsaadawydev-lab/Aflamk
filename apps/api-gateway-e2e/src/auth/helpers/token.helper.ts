/**
 * Token helper utilities for auth E2E tests.
 * Generates real JWTs (signed locally) to simulate expired / tampered tokens
 * without needing to wait for real expiry or touching the live service.
 */
import * as jwt from 'jsonwebtoken';

/** Secrets must match libs/env/.env.development */
export const JWT_ACCESS_SECRET = 'FASDF46fasdf8464fd68fdaf4sa64f64fsa64';
export const JWT_REFRESH_SECRET = 'FASDFFJfjiefnuasdfjouijejirjfkjsfabe838';

/** Generate a VALID access token (5-min TTL) for a given userId. */
export function makeAccessToken(userId: string, role = 'user'): string {
  return jwt.sign({ id: userId, role }, JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });
}

/** Generate an ALREADY-EXPIRED access token (expired 10 seconds ago). */
export function makeExpiredAccessToken(userId: string): string {
  return jwt.sign({ id: userId, role: 'user' }, JWT_ACCESS_SECRET, {
    expiresIn: -10, // negative = already expired
  });
}

/** Generate a token signed with the WRONG secret (simulates tampering). */
export function makeTamperedAccessToken(userId: string): string {
  return jwt.sign({ id: userId, role: 'user' }, 'WRONG_SECRET_FOR_TESTING');
}

/**
 * Take a real valid JWT string and mutate one character in the
 * signature segment — keeps the header/payload valid-looking but
 * signature verification will always fail.
 */
export function corruptSignature(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT format');

  const sig = parts[2];
  // Flip one character in the middle of the signature
  const mid = Math.floor(sig.length / 2);
  const corrupted =
    sig.slice(0, mid) +
    (sig[mid] === 'a' ? 'b' : 'a') +
    sig.slice(mid + 1);

  return `${parts[0]}.${parts[1]}.${corrupted}`;
}

/**
 * Modify the payload of a real JWT to escalate privileges
 * (keeps original signature → tampered result).
 */
export function tamperPayload(token: string, newPayload: object): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT format');

  const tamperedPayload = Buffer.from(JSON.stringify(newPayload)).toString(
    'base64url',
  );
  return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
}
