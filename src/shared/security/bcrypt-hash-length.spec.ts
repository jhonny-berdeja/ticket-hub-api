import * as bcrypt from 'bcrypt';

/**
 * Shared invariant relied on by both `UsersService.create` and
 * `AuthService.login`'s hash comparison: bcrypt output must always fit the
 * `password` column's `VARCHAR(100)` regardless of input length. bcrypt's
 * own algorithm caps effective input at 72 bytes and produces a fixed
 * ~60-char output ("$2b$10$" + 53 chars), so even a maximum-length input
 * never risks a silent insert failure.
 */
describe('bcrypt hash length', () => {
  it('fits within VARCHAR(100) for a short password', async () => {
    const hash = await bcrypt.hash('secret1', 10);
    expect(hash.length).toBeLessThanOrEqual(100);
  });

  it('fits within VARCHAR(100) for a long (72+ byte) password', async () => {
    const hash = await bcrypt.hash('a'.repeat(72), 10);
    expect(hash.length).toBeLessThanOrEqual(100);
  });
});
