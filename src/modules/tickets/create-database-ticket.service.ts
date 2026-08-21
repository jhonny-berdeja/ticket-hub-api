import { Injectable } from '@nestjs/common';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

/**
 * `TicketsService.createDatabase` extracted here because it needs its own
 * numbering/persistence flow — deliberately NOT shared with
 * `CreateAnsibleTicketService` even though the two are nearly identical,
 * so each create flow can be read and changed in isolation. See
 * `project-structure-conventions.md`, "Handlers en el service general vs.
 * service dedicado".
 */
@Injectable()
export class CreateDatabaseTicketService {
  constructor(
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
  ) {}

  async createDatabase(
    dto: CreateDatabaseTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.databaseTicketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toDatabaseEntity(
      dto,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.databaseTicketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toDatabaseResponse(createdTicket))
      .build();
  }
}
