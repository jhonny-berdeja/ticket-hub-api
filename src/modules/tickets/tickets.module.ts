import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';
import { PcboxApiModule } from '../pcbox-api/pcbox-api.module';

/**
 * `TicketsRepository`/`RolesRepository` come from the `@Global()`
 * `DatabaseModule`, and `JwtAuthGuard`/`RolesGuard` are registered
 * globally in `AppModule` (see app.module.ts) - unlike `UsersModule`,
 * this module never needed to import `AuthModule` for a per-controller
 * `@UseGuards(JwtAuthGuard, ...)`, since that pattern is gone entirely
 * now that both guards are global.
 *
 * `PcboxApiModule` DOES need to be imported: it's an ordinary
 * (non-global) feature module owning one external integration (the
 * outbound call to pcbox-api after a ticket is approved) — split out so
 * it can be read/tested independent of `tickets`' own HTTP contract.
 * One-directional dependency (`tickets` → `pcbox-api`, never the
 * reverse) — see its own module comment.
 */
@Module({
  imports: [PcboxApiModule],
  controllers: [TicketsController],
  providers: [TicketsService, ApproveTicketService],
})
export class TicketsModule {}
