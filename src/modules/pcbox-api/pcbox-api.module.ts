import { Module } from '@nestjs/common';
import { PcboxApiService } from './pcbox-api.service';
import { PcboxApiConnector } from './pcbox-api.connector';

/**
 * No controller: nothing calls this module over HTTP, `TicketsModule`
 * consumes `PcboxApiService` directly via DI (one-directional dependency,
 * `tickets` → `pcbox-api`, never the reverse). `PcboxApiConnector` is a
 * provider but never exported — same connector-vs-service split
 * pcbox-api itself uses for its own outbound-call modules.
 */
@Module({
  providers: [PcboxApiService, PcboxApiConnector],
  exports: [PcboxApiService],
})
export class PcboxApiModule {}
