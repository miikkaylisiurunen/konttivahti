import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPasswordHash, passwordHashOptions } from './passwordHash';

describe('passwordHash', () => {
  it('hashes with argon2id and verifies correctly', async () => {
    const password = 'my-secure-password';
    const hash = await hashPassword(password);

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPasswordHash(hash, password)).toBe(true);
    expect(await verifyPasswordHash(hash, 'wrong-password')).toBe(false);
  });

  it('uses the configured argon2 parameters', async () => {
    const password = 'another-test-password';
    const hash = await hashPassword(password);

    expect(hash).toContain(`m=${passwordHashOptions.memoryCost}`);
    expect(hash).toContain(`t=${passwordHashOptions.timeCost}`);
    expect(hash).toContain(`p=${passwordHashOptions.parallelism}`);
  });

  it('returns false for invalid hash input', async () => {
    expect(await verifyPasswordHash('not-a-valid-hash', 'password')).toBe(false);
  });
});
