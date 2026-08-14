import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { EnvModule } from './common/config/env.module';
import { DatabaseModule } from './common/database/database.module';
import { LoggerModule } from './instrument/logger/logger.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    EnvModule,
    LoggerModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    TicketsModule,
  ],
  providers: [
    // Global, in this order: JwtAuthGuard authenticates every request by
    // default (the only exception is @Public(), used solely by
    // POST /auth/login) and populates request.user; RolesGuard then
    // checks it against @Roles(...) when present, or no-ops otherwise.
    // Individual controllers no longer declare @UseGuards for either —
    // a new endpoint is locked down unless someone explicitly opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
