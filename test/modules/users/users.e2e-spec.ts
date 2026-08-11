import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '../../../src/modules/users/users.module';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

/**
 * Real end-to-end: real `UsersModule` (and, through it, real `AuthModule`
 * for password hashing and the guards) against a real — if in-memory —
 * database. No mocked repository or service.
 */
describe('Users flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let adminToken: string;
  let devToken: string;

  beforeAll(async () => {
    ({ app, moduleFixture } = await bootstrapTestApp([UsersModule]));

    adminToken = await seedAuthenticatedUser(
      app,
      moduleFixture,
      'admin@example.com',
      [Role.ADMIN],
    );
    devToken = await seedAuthenticatedUser(
      app,
      moduleFixture,
      'dev@example.com',
      [Role.DEV],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects user creation with no bearer token', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana',
        lastname: 'Perez',
        email: 'no-token@example.com',
        password: 'secret1',
        roles: [Role.DEV],
      })
      .expect(401);
  });

  it('rejects user creation from an authenticated non-ADMIN', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        name: 'Ana',
        lastname: 'Perez',
        email: 'blocked@example.com',
        password: 'secret1',
        roles: [Role.DEV],
      })
      .expect(403);
  });

  it('happy path: ADMIN creates a user with roles, password never in the response', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
        password: 'secret1',
        roles: [Role.DEV, Role.APPROVER],
      })
      .expect(201);

    expect(response.body).toEqual({
      msg: 'User created successfully',
      data: {
        id: expect.any(Number) as number,
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
        roles: [Role.DEV, Role.APPROVER],
      },
    });
  });

  it('lists users with their roles, ADMIN-only', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as {
      data: { email: string; roles: Role[] }[];
    };
    const emails = body.data.map((user) => user.email);
    expect(emails).toEqual(
      expect.arrayContaining(['admin@example.com', 'dev@example.com']),
    );
  });

  it('happy path: ADMIN edits a user - fields and roles both replaced', async () => {
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Before',
        lastname: 'Edit',
        email: 'before-edit@example.com',
        password: 'secret1',
        roles: [Role.DEV],
      })
      .expect(201);

    const createdId = (created.body as { data: { id: number } }).data.id;

    const response = await request(app.getHttpServer())
      .patch(`/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'After',
        lastname: 'Edit',
        email: 'after-edit@example.com',
        roles: [Role.ADMIN, Role.APPROVER],
      })
      .expect(200);

    expect(response.body).toEqual({
      msg: 'User updated successfully',
      data: {
        id: createdId,
        name: 'After',
        lastname: 'Edit',
        email: 'after-edit@example.com',
        roles: [Role.ADMIN, Role.APPROVER],
      },
    });
  });

  it('rejects editing to an email already used by another user', async () => {
    await request(app.getHttpServer())
      .patch('/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin',
        lastname: 'User',
        email: 'dev@example.com',
        roles: [Role.ADMIN],
      })
      .expect(409);
  });
});
