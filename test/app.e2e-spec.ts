import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

/**
 * Scoped e2e: exercises only `AppController`/`AppService` (the stock Nest
 * "Hello World" scaffold, no DB/config dependency), same pattern as
 * `test/users.controller.e2e-spec.ts` and `test/auth.controller.e2e-spec.ts`.
 *
 * Deliberately does NOT import the full `AppModule`: that module wires
 * `ConfigModule` (fail-fast `validate()` requiring 7 env vars) and the real
 * `DatabaseModule` (a live TypeORM Postgres connection). Neither exists in
 * this cluster-only, no-local-env, no-local-DB project, so booting the full
 * module graph here would fail regardless of env vars supplied to the test
 * process — this controller doesn't need any of that to be exercised.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
