import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { UsersService } from '../../../src/modules/users/users.service';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';

/**
 * Real end-to-end: real `AuthModule` + real `UsersModule` against a real —
 * if in-memory — database. The user logged into is seeded through the real
 * `UsersService.create()` (so it's hashed by the real `AuthService`), not
 * inserted directly, keeping the whole credential path genuine.
 */
describe('Auth flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;

  const KNOWN_EMAIL = 'ana@example.com';
  const KNOWN_PASSWORD = 'secret1';

  beforeAll(async () => {
    const testApp = await bootstrapTestApp([UsersModule, AuthModule]);
    app = testApp.app;

    const usersService = testApp.moduleFixture.get(UsersService);
    await usersService.create({
      name: 'Ana',
      lastname: 'Perez',
      email: KNOWN_EMAIL,
      password: KNOWN_PASSWORD,
      roles: [Role.DEV],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('happy path: logs in with valid credentials and returns a signed JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: KNOWN_EMAIL, password: KNOWN_PASSWORD })
      .expect(200);

    const body = response.body as { access_token: string };
    expect(typeof body.access_token).toBe('string');
    expect(body.access_token.length).toBeGreaterThan(0);
  });
});
