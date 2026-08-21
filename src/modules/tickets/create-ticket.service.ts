import { Injectable } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

/**
 * `TicketsService.createAnsible`/`createDatabase` consolidated here: one
 * method per ticket kind, each keeping its own numbering/persistence flow
 * scoped to its own repository/mapper pair.
 */
@Injectable()
export class CreateTicketService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
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
