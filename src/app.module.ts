import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { EnvModule } from './common/config/env.module';
import { DatabaseModule } from './common/database/database.module';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UnknownExceptionFilter } from './common/filters/unknown-exception.filter';
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
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // UnknownExceptionFilter MUST stay first here, counterintuitively:
    // Nest's RouterExceptionFilters reverses this array before matching
    // (`filters.reverse()` in @nestjs/core/router/router-exception-filters.js)
    // — first-match-wins is applied to the REVERSED list, so whatever's
    // declared first here is tried LAST at runtime. Its argument-less
    // @Catch() matches everything, so it has to end up last or it
    // swallows every TypeORMError/HttpException before the other two
    // filters ever run (verified empirically, not just read off the
    // source — this order is not the obvious one).
    { provide: APP_FILTER, useClass: UnknownExceptionFilter },
    // Order between these two doesn't matter to each other: TypeORMError
    // and HttpException are disjoint exception classes, each filter only
    // ever matches its own kind.
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
