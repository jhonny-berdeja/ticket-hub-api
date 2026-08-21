import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';
const ADMIN_ROLE_NAME: string = Role.ADMIN;

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  createAnsible(
    dto: CreateAnsibleTicketDto,
    creator: number,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.persistNewTicket((number) =>
      TicketMapper.toAnsibleEntity(dto, creator, informer, number),
    );
  }

  createDatabase(
    dto: CreateDatabaseTicketDto,
    creator: number,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.persistNewTicket((number) =>
      TicketMapper.toDatabaseEntity(dto, creator, informer, number),
    );
  }

  async findMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const canViewAll = isAdmin(user);

    const tickets = canViewAll
      ? await this.ticketsRepository.findAll()
      : await this.ticketsRepository.findByCreator(user.sub);

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(tickets.map((ticket) => TicketMapper.toResponse(ticket)))
      .build();
  }

  async findByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const ticket = await this.ticketsRepository.findByNumber(number);
    const canViewAll = isAdmin(user);

    if (!ticket || (!canViewAll && ticket.creator !== user.sub)) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(TicketMapper.toResponse(ticket))
      .build();
  }

  /**
   * Shared by both create endpoints: only the entity-building step differs
   * (`TicketMapper.toAnsibleEntity` vs. `toDatabaseEntity`) — numbering,
   * persistence and response-building are identical, so they live here
   * once instead of being duplicated across `createAnsible`/`createDatabase`.
   */
  private async persistNewTicket(
    buildEntity: (number: number) => TicketEntity,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.ticketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = buildEntity(nextNumber);
    const createdTicket =
      await this.ticketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toResponse(createdTicket))
      .build();
  }
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.apps.application.roles.some(
    (role) => role.name === ADMIN_ROLE_NAME,
  );
}
