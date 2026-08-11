import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '../../../src/modules/users/users.module';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';

/**
 * Real end-to-end: real `UsersModule` (and, through it, real `AuthModule`
 * for password hashing) against a real — if in-memory — database. No
 * mocked repository or service, unlike the older mocked-repo e2e specs.
 */
describe('Users flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await bootstrapTestApp([UsersModule]));
  });

  afterAll(async () => {
    await app.close();
  });

  it('happy path: creates a user and returns it wrapped in ResponseBody, without the password', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
        password: 'secret1',
      })
      .expect(201);

    expect(response.body).toEqual({
      msg: 'User created successfully',
      data: {
        id: expect.any(Number) as number,
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
      },
    });
  });
});
