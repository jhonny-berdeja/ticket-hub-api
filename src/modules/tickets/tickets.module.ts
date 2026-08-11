import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';

/**
 * No `imports` needed: `TicketsRepository`/`RolesRepository` come from
 * the `@Global()` `DatabaseModule`, and `JwtAuthGuard`/`RolesGuard` are
 * registered globally in `AppModule` (see app.module.ts) - unlike
 * `UsersModule`, this module never needed to import `AuthModule` for a
 * per-controller `@UseGuards(JwtAuthGuard, ...)`, since that pattern is
 * gone entirely now that both guards are global.
 */
@Module({
  controllers: [TicketsController],
  providers: [TicketsService, ApproveTicketService],
})
export class TicketsModule {}
