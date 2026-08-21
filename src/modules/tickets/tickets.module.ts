import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { ApproveTicketService } from './approve-ticket.service';
import { CreateAnsibleTicketService } from './create-ansible-ticket.service';
import { CreateDatabaseTicketService } from './create-database-ticket.service';
import { FindTicketByNumberService } from './find-ticket-by-number.service';
import { ListAnsibleTicketsService } from './list-ansible-tickets.service';
import { ListDatabaseTicketsService } from './list-database-tickets.service';
import { PcboxApiModule } from '../pcbox-api/pcbox-api.module';
import { IamApiModule } from '../iam-api/iam-api.module';

@Module({
  imports: [PcboxApiModule, IamApiModule],
  controllers: [TicketsController],
  providers: [
    ApproveTicketService,
    CreateAnsibleTicketService,
    CreateDatabaseTicketService,
    FindTicketByNumberService,
    ListAnsibleTicketsService,
    ListDatabaseTicketsService,
  ],
})
export class TicketsModule {}
