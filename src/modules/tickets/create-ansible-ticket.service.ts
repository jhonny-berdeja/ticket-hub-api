import { Injectable } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

/**
 * `TicketsService.createAnsible` extracted here because it needs its own
 * numbering/persistence flow — deliberately NOT shared with
 * `CreateDatabaseTicketService` even though the two are nearly identical,
 * so each create flow can be read and changed in isolation. See
 * `project-structure-conventions.md`, "Handlers en el service general vs.
 * service dedicado".
 */
@Injectable()
export class CreateAnsibleTicketService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
  ) {}

  async createAnsible(
    dto: CreateAnsibleTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.datacenterTicketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toAnsibleEntity(
      dto,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.datacenterTicketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toAnsibleResponse(createdTicket))
      .build();
  }
}
