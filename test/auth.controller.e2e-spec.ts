import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '../src/shared/database/entities/user.entity';
import { UsersRepository } from '../src/shared/database/repositories/users.repository';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

interface LoginResponseBody {
  access_token?: string;
  message?: string;
}

/**
 * Mocked-repo e2e: exercises the real Nest HTTP pipeline (routing,
 * ValidationPipe, controller, service, real `JwtModule` signing) without a
 * real Postgres connection — there is no local DB by design decision. Only
 * `UsersRepository` is substituted with an in-memory fake, same pattern as
 * `test/users.controller.e2e-spec.ts`.
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let users: User[];

  const KNOWN_PASSWORD = 'secret1';

  const fakeUsersRepository: Partial<Record<keyof UsersRepository, jest.Mock>> =
    {
      findByEmail: jest.fn((email: string) =>
        Promise.resolve(users.find((u) => u.email === email) ?? null),
      ),
    };

  beforeEach(async () => {
    users = [
      {
        id: 1,
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
        password: await bcrypt.hash(KNOWN_PASSWORD, 10),
      },
    ];
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: fakeUsersRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns an access token for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: KNOWN_PASSWORD })
      .expect(200);

    const body = response.body as LoginResponseBody;
    expect(typeof body.access_token).toBe('string');
    expect(body.access_token).not.toBe('');
  });

  it('rejects an unknown email with a generic 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: KNOWN_PASSWORD })
      .expect(401);

    const body = response.body as LoginResponseBody;
    expect(body.message).toBe('Invalid credentials');
  });

  it('rejects a wrong password with the identical generic 401 message', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'wrong-password' })
      .expect(401);

    const body = response.body as LoginResponseBody;
    expect(body.message).toBe('Invalid credentials');
  });

  it('rejects a malformed request body with a 4xx', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
