import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
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
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
  ) {}

  createAnsible(
    dto: CreateAnsibleTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.persistNewTicket(
      this.datacenterTicketsRepository,
      (number) => TicketMapper.toAnsibleEntity(dto, informer, number),
      TicketMapper.toAnsibleResponse,
    );
  }

  createDatabase(
    dto: CreateDatabaseTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.persistNewTicket(
      this.databaseTicketsRepository,
      (number) => TicketMapper.toDatabaseEntity(dto, informer, number),
      TicketMapper.toDatabaseResponse,
    );
  }

  /**
   * Merges both tables into one list. There is no cross-table ordering
   * guarantee (each table numbers independently — see `ticket-hub-db.md`),
   * ANSIBLE results are simply concatenated before DATABASE ones.
   */
  async findMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const canViewAll = isAdmin(user);

    const [datacenterTickets, databaseTickets] = canViewAll
      ? await Promise.all([
          this.datacenterTicketsRepository.findAll(),
          this.databaseTicketsRepository.findAll(),
        ])
      : await Promise.all([
          this.datacenterTicketsRepository.findByInformer(user.email),
          this.databaseTicketsRepository.findByInformer(user.email),
        ]);

    const tickets = [
      ...datacenterTickets.map((ticket) =>
        TicketMapper.toAnsibleResponse(ticket),
      ),
      ...databaseTickets.map((ticket) =>
        TicketMapper.toDatabaseResponse(ticket),
      ),
    ];

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(tickets)
      .build();
  }

  /**
   * Each table has its own independent `number` sequence, so a bare
   * `number` is ambiguous across tables — try `datacenter_tickets` first,
   * then fall back to `database_tickets`.
   */
  async findByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const canViewAll = isAdmin(user);

    const datacenterTicket =
      await this.datacenterTicketsRepository.findByNumber(number);
    if (datacenterTicket) {
      if (!canViewAll && datacenterTicket.informer !== user.email) {
        throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
      }
      return ResponseBody.builder<TicketResponse>()
        .withMsg('Ticket found')
        .withData(TicketMapper.toAnsibleResponse(datacenterTicket))
        .build();
    }

    const databaseTicket =
      await this.databaseTicketsRepository.findByNumber(number);
    if (databaseTicket) {
      if (!canViewAll && databaseTicket.informer !== user.email) {
        throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
      }
      return ResponseBody.builder<TicketResponse>()
        .withMsg('Ticket found')
        .withData(TicketMapper.toDatabaseResponse(databaseTicket))
        .build();
    }

    throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
  }

  /**
   * Shared by both create endpoints: only the entity-building step and
   * the repository/response-mapper pair differ per ticket kind —
   * numbering and persistence flow are identical, so they live here once
   * instead of being duplicated across `createAnsible`/`createDatabase`.
   */
  private async persistNewTicket<TEntity>(
    repository: {
      findMaxNumber(): Promise<number | null>;
      createTicket(entity: TEntity): Promise<TEntity>;
    },
    buildEntity: (number: number) => TEntity,
    toResponse: (entity: TEntity) => TicketResponse,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await repository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = buildEntity(nextNumber);
    const createdTicket = await repository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(toResponse(createdTicket))
      .build();
  }
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.apps.application.roles.some(
    (role) => role.name === ADMIN_ROLE_NAME,
  );
}
