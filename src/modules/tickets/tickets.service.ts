import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import {
  DATABASE_NUMBER_DISPLAY_PREFIX,
  DATACENTER_NUMBER_DISPLAY_PREFIX,
  TicketMapper,
} from './ticket.mapper';
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
   * integer is ambiguous across tables — `displayNumber` carries the
   * per-kind prefix (`DC-`/`DB-`) that says which table to query, and
   * only that table is queried, never both. An unrecognized prefix, a
   * non-integer suffix, and a well-formed-but-not-found number all
   * collapse into the same "not found" response — never leaking which
   * case it was.
   */
  async findByNumber(
    displayNumber: string,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const parsed = parseDisplayNumber(displayNumber);
    if (!parsed) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

    const result =
      parsed.kind === TicketType.ANSIBLE
        ? await this.findTicketByNumber(
            this.datacenterTicketsRepository,
            TicketMapper.toAnsibleResponse,
            parsed.number,
            user,
          )
        : await this.findTicketByNumber(
            this.databaseTicketsRepository,
            TicketMapper.toDatabaseResponse,
            parsed.number,
            user,
          );

    if (!result) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return result;
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

  /**
   * Shared by `findByNumber`'s two branches: only the repository/response-
   * mapper pair differs per ticket kind — the lookup-then-authorize flow is
   * identical, so it lives here once. Returns `null` (never throws) for
   * "not found" or "found but not visible to this user", so both collapse
   * into the same `NotFoundException` at the call site.
   */
  private async findTicketByNumber<TEntity extends { informer: string }>(
    repository: { findByNumber(number: number): Promise<TEntity | null> },
    toResponse: (entity: TEntity) => TicketResponse,
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse> | null> {
    const ticket = await repository.findByNumber(number);
    if (!ticket) {
      return null;
    }

    if (!isAdmin(user) && ticket.informer !== user.email) {
      return null;
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(toResponse(ticket))
      .build();
  }
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.apps.application.roles.some(
    (role) => role.name === ADMIN_ROLE_NAME,
  );
}

const DISPLAY_NUMBER_SUFFIX_PATTERN = /^\d+$/;

type ParsedDisplayNumber = {
  kind: TicketType.ANSIBLE | TicketType.DATABASE;
  number: number;
};

/**
 * Parses a display number (`DC-1`, `DB-42`) into which table to query and
 * the bare integer to query it with. Returns `null` for anything that
 * isn't well-formed — an unrecognized prefix or a non-integer suffix —
 * so the caller can treat it exactly like a well-formed number that
 * simply doesn't exist.
 */
function parseDisplayNumber(displayNumber: string): ParsedDisplayNumber | null {
  let prefix: string;
  let kind: TicketType.ANSIBLE | TicketType.DATABASE;

  if (displayNumber.startsWith(DATACENTER_NUMBER_DISPLAY_PREFIX)) {
    prefix = DATACENTER_NUMBER_DISPLAY_PREFIX;
    kind = TicketType.ANSIBLE;
  } else if (displayNumber.startsWith(DATABASE_NUMBER_DISPLAY_PREFIX)) {
    prefix = DATABASE_NUMBER_DISPLAY_PREFIX;
    kind = TicketType.DATABASE;
  } else {
    return null;
  }

  const suffix = displayNumber.slice(prefix.length);
  if (!DISPLAY_NUMBER_SUFFIX_PATTERN.test(suffix)) {
    return null;
  }

  return { kind, number: Number(suffix) };
}
