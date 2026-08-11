import {
  INestApplication,
  ModuleMetadata,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { InMemoryDatabaseModule } from './in-memory-database.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';

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
 * Also re-registers JwtAuthGuard/RolesGuard as APP_GUARD here: this
 * harness builds its own TestingModule instead of importing the real
 * AppModule, so AppModule's own global-guard registration never runs in
 * e2e specs unless duplicated here too - both guards are already safe
 * to register twice (no-op without @Public()/@Roles() as appropriate).
 *
 * AuthModule is always added to `imports` here too, even if the caller
 * already passes it (Nest dedupes re-imports of the same module, so
 * that's harmless): JwtAuthGuard depends on JwtService, which only
 * AuthModule provides, and the APP_GUARD providers above are registered
 * at THIS root testing module - a caller that only needs `[UsersModule]`
 * (which imports AuthModule internally, but doesn't re-export it) would
 * otherwise leave JwtService unresolvable at the root, the same
 * cross-module-boundary issue AuthModule itself hit re-exporting
 * jwtModule for @UseGuards(JwtAuthGuard) - see auth.module.ts.
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
      AuthModule,
      ...imports,
    ],
    providers: [
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, moduleFixture };
}
