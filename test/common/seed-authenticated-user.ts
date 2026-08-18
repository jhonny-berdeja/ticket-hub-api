import * as jwt from 'jsonwebtoken';
import { Role } from '../../src/common/database/role/role.enum';
import { TEST_KID, TEST_PRIVATE_KEY } from './test-jwt-keys';

const TICKET_HUB_APPLICATION = {
  id: 1,
  name: 'ticket-hub',
  description: 'Ticket Hub',
};

/**
 * Counter, not a DB id: there's no local `users` table left to insert
 * into (ticket-hub authenticates against auth-api now) -- `sub` only
 * needs to be a distinct number per seeded user within one test run, so
 * "my tickets vs. someone else's" filtering has something real to
 * distinguish on.
 */
let nextSub = 1;

/**
 * Signs an auth-api-shaped token directly with the test RSA key -- no
 * DB, no HTTP round trip, since there's no local login left to go
 * through either (see `auth.controller.ts`'s history).
 */
export function seedAuthenticatedUser(email: string, roles: Role[]): string {
  const payload = {
    sub: nextSub++,
    email,
    apps: {
      application: {
        ...TICKET_HUB_APPLICATION,
        roles: roles.map((name, index) => ({
          id: index + 1,
          name,
          description: name,
        })),
      },
    },
  };

  return jwt.sign(payload, TEST_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: TEST_KID,
    expiresIn: '1h',
  });
}
