import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

/**
 * `POST /auth/login` is gone (see `auth.controller.ts`'s history) --
 * ticket-hub no longer authenticates against this app, only auth-api
 * does. This spec only covers what's left: `GET /auth/me` reading an
 * auth-api-issued token, via the same `seedAuthenticatedUser` helper
 * every other e2e spec uses.
 */
describe('Auth flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const testApp = await bootstrapTestApp([AuthModule]);
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/me returns the caller identity/roles for an auth-api-issued token', async () => {
    const token = seedAuthenticatedUser('other-user@example.com', [Role.ADMIN]);

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
      Role.ADMIN,
    ]);
  });

  it('rejects GET /auth/me with no bearer token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
