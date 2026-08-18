import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { UsersModule } from '../../../src/modules/users/users.module';
import { UsersService } from '../../../src/modules/users/users.service';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

/**
 * Real end-to-end: real `AuthModule` + real `UsersModule` against a real —
 * if in-memory — database. The user logged into is seeded through the real
 * `UsersService.create()` (so it's hashed by the real `AuthService`), not
 * inserted directly, keeping the whole credential path genuine.
 */
describe('Auth flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  const KNOWN_EMAIL = 'ana@example.com';
  const KNOWN_PASSWORD = 'secret1';

  beforeAll(async () => {
    const testApp = await bootstrapTestApp([UsersModule, AuthModule]);
    app = testApp.app;
    moduleFixture = testApp.moduleFixture;

    const usersService = moduleFixture.get(UsersService);
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

  /**
   * Documents the migration-in-progress state, not a bug: JwtAuthGuard
   * verifies exclusively against auth-api's JWKS now (see its own
   * comment), so a token this app signs itself is structurally valid
   * but accepted by nobody, including this app's own guard.
   */
  it("a token from POST /auth/login no longer authenticates against this app's own guard", async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: KNOWN_EMAIL, password: KNOWN_PASSWORD })
      .expect(200);
    const { access_token: token } = loginResponse.body as {
      access_token: string;
    };

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('GET /auth/me returns the caller identity/roles for an auth-api-issued token', async () => {
    const token = await seedAuthenticatedUser(
      moduleFixture,
      'other-user@example.com',
      [Role.DEV],
    );

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as {
      msg: string;
      data: {
        sub: number;
        email: string;
        apps: { application: { name: string; roles: { name: string }[] } };
      };
    };
    expect(body.msg).toBe('Current user');
    expect(body.data.email).toBe('other-user@example.com');
    expect(body.data.apps.application.name).toBe('ticket-hub');
    expect(body.data.apps.application.roles.map((role) => role.name)).toEqual([
      Role.DEV,
    ]);
  });

  it('rejects GET /auth/me with no bearer token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
