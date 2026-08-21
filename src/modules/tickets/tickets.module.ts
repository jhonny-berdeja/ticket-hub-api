import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { ApproveTicketService } from './approve-ticket.service';
import { CreateTicketService } from './create-ticket.service';
import { FindTicketByNumberService } from './find-ticket-by-number.service';
import { ListTicketsService } from './list-tickets.service';
import { PcboxApiModule } from '../pcbox-api/pcbox-api.module';
import { IamApiModule } from '../iam-api/iam-api.module';

@Module({
  imports: [PcboxApiModule, IamApiModule],
  controllers: [TicketsController],
  providers: [
    ApproveTicketService,
    CreateTicketService,
    FindTicketByNumberService,
    ListTicketsService,
  ],
})
export class TicketsModule {}
