import { TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { Role } from '../../src/common/database/role/role.enum';
import { UsersService } from '../../src/modules/users/users.service';
import { TEST_KID, TEST_PRIVATE_KEY } from './test-jwt-keys';

const TICKET_HUB_APPLICATION = {
  id: 1,
  name: 'ticket-hub',
  description: 'Ticket Hub',
};

/**
 * Seeds a user directly through the real `UsersService` (bypassing the
 * `POST /users` guard entirely, since this is a plain method call, not
 * an HTTP request), then signs an auth-api-shaped token directly with
 * the test RSA key -- NOT via `POST /auth/login` anymore, since that
 * route now issues a locally-signed token `JwtAuthGuard` won't accept
 * (see `auth.controller.ts`'s comment). `sub` is fabricated (the local
 * `UsersService.create` return value isn't needed by any of these
 * callers today) rather than round-tripped through the DB.
 */
export async function seedAuthenticatedUser(
  moduleFixture: TestingModule,
  email: string,
  roles: Role[],
): Promise<string> {
  const password = 'secret1';

  const usersService = moduleFixture.get(UsersService);
  const created = await usersService.create({
    name: 'Seed',
    lastname: 'User',
    email,
    password,
    roles,
  });

  const payload = {
    sub: created.data.id,
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
