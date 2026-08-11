import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '../src/shared/database/entities/user.entity';
import { UsersRepository } from '../src/shared/database/repositories/users.repository';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

interface CreateUserResponseBody {
  id: number;
  name: string;
  lastname: string;
  email: string;
  password?: string;
}

/**
 * Mocked-repo e2e: exercises the real Nest HTTP pipeline (routing, the
 * global-equivalent ValidationPipe, controller, service) without a real
 * Postgres connection — there is no local DB by design decision. Only
 * `UsersRepository` (the seam `DatabaseModule` normally provides) is
 * substituted with an in-memory fake.
 */
describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let users: User[];

  const fakeUsersRepository: Partial<Record<keyof UsersRepository, jest.Mock>> =
    {
      findByEmail: jest.fn((email: string) =>
        Promise.resolve(users.find((u) => u.email === email) ?? null),
      ),
      createUser: jest.fn((user: Omit<User, 'id'>) => {
        const created = { id: users.length + 1, ...user };
        users.push(created);
        return Promise.resolve(created);
      }),
    };

  beforeEach(async () => {
    users = [];
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
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

  it('creates a user and never returns the password', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana',
        lastname: 'Perez',
        email: 'ana@example.com',
        password: 'secret1',
      })
      .expect(201);

    const body = response.body as CreateUserResponseBody;
    expect(body).toEqual({
      id: expect.any(Number) as number,
      name: 'Ana',
      lastname: 'Perez',
      email: 'ana@example.com',
    });
    expect(body.password).toBeUndefined();
  });

  it('rejects a duplicate email with a 4xx response', async () => {
    await request(app.getHttpServer()).post('/users').send({
      name: 'Ana',
      lastname: 'Perez',
      email: 'ana@example.com',
      password: 'secret1',
    });

    const response = await request(app.getHttpServer()).post('/users').send({
      name: 'Otra',
      lastname: 'Persona',
      email: 'ana@example.com',
      password: 'secret2',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(users).toHaveLength(1);
  });

  it('rejects a field longer than its column width', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'a'.repeat(16),
        lastname: 'Perez',
        email: 'ana@example.com',
        password: 'secret1',
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(users).toHaveLength(0);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const response = await request(app.getHttpServer()).post('/users').send({
      name: 'Ana',
      lastname: 'Perez',
      email: 'ana@example.com',
      password: 'abc12',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(users).toHaveLength(0);
  });
});
