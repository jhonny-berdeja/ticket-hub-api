import {
  INestApplication,
  ModuleMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { InMemoryDatabaseModule } from './in-memory-database.module';

export interface TestApp {
  app: INestApplication<App>;
  moduleFixture: TestingModule;
}

/**
 * Boots a real Nest app for e2e specs — global `ConfigModule` (with a test
 * `JWT_SECRET`) + the shared in-memory DB, plus whatever feature modules the
 * caller needs. Mirrors `main.ts`'s `ValidationPipe` setup so validation
 * behaves the same as it does in production.
 *
 * Returns `moduleFixture` too so specs that need to seed data through a real
 * service (see `test/modules/auth/auth.e2e-spec.ts`) can `.get()` it.
 */
export async function bootstrapTestApp(
  imports: NonNullable<ModuleMetadata['imports']>,
): Promise<TestApp> {
  process.env.JWT_SECRET = 'test-secret';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      InMemoryDatabaseModule,
      ...imports,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, moduleFixture };
}
