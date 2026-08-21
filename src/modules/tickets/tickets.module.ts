import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';
import { PcboxApiModule } from '../pcbox-api/pcbox-api.module';
import { IamApiModule } from '../iam-api/iam-api.module';

@Module({
  imports: [PcboxApiModule, IamApiModule],
  controllers: [TicketsController],
  providers: [TicketsService, ApproveTicketService],
})
export class TicketsModule {}
