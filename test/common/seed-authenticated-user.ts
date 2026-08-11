import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../../src/common/database/role/role.enum';
import { UsersService } from '../../src/modules/users/users.service';

/**
 * Seeds a user directly through the real `UsersService` (bypassing the
 * `POST /users` guard entirely, since this is a plain method call, not
 * an HTTP request) with the given roles, then logs in over real HTTP to
 * get a genuine, signed bearer token — the same two-step shape
 * `auth.e2e-spec.ts` already used, extracted so `users.e2e-spec.ts` can
 * reuse it for both ADMIN and non-ADMIN callers.
 */
export async function seedAuthenticatedUser(
  app: INestApplication<App>,
  moduleFixture: TestingModule,
  email: string,
  roles: Role[],
): Promise<string> {
  const password = 'secret1';

  const usersService = moduleFixture.get(UsersService);
  await usersService.create({
    name: 'Seed',
    lastname: 'User',
    email,
    password,
    roles,
  });

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return (loginResponse.body as { access_token: string }).access_token;
}
