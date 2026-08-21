import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  DATABASE_NUMBER_DISPLAY_PREFIX,
  DATACENTER_NUMBER_DISPLAY_PREFIX,
  TicketMapper,
} from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';
const ADMIN_ROLE_NAME: string = Role.ADMIN;

/**
 * `TicketsService.findByNumber` extracted here because it needs its own
 * lookup-then-authorize flow. Its two branches (datacenter/ANSIBLE vs.
 * database/DATABASE) are deliberately written out in full below, NOT
 * factored into one shared generic helper, even though they're nearly
 * identical — see `project-structure-conventions.md`, "Handlers en el
 * service general vs. service dedicado". `isAdmin` stays as one small
 * shared free function: it's a trivial one-line auth check, not a "flow".
 */
@Injectable()
export class FindTicketByNumberService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
  ) {}

  /**
   * Each table has its own independent `number` sequence, so a bare
   * integer is ambiguous across tables — `displayNumber` carries the
   * per-kind prefix (`DC-`/`DB-`) that says which table to query, and
   * only that table is queried, never both. An unrecognized prefix, a
   * non-integer suffix, a well-formed-but-not-found number, and a
   * found-but-not-authorized ticket all collapse into the same "not
   * found" response — never leaking which case it was.
   */
  async findByNumber(
    displayNumber: string,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const parsed = this.parseDisplayNumber(displayNumber);
    if (!parsed) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

    const result =
      parsed.kind === TicketType.ANSIBLE
        ? await this.findDatacenterTicketByNumber(parsed.number, user)
        : await this.findDatabaseTicketByNumber(parsed.number, user);

    if (!result) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return result;
  }

  private async findDatacenterTicketByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse> | null> {
    const ticket = await this.datacenterTicketsRepository.findByNumber(
      number,
    );
    if (!ticket) {
      return null;
    }

    if (!this.isAdmin(user) && ticket.informer !== user.email) {
      return null;
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(TicketMapper.toAnsibleResponse(ticket))
      .build();
  }

  private async findDatabaseTicketByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse> | null> {
    const ticket = await this.databaseTicketsRepository.findByNumber(number);
    if (!ticket) {
      return null;
    }

    if (!this.isAdmin(user) && ticket.informer !== user.email) {
      return null;
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(TicketMapper.toDatabaseResponse(ticket))
      .build();
  }

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.apps.application.roles.some(
      (role) => role.name === ADMIN_ROLE_NAME,
    );
  }

  /**
   * Parses a display number (`DC-1`, `DB-42`) into which table to query and
   * the bare integer to query it with. Returns `null` for anything that
   * isn't well-formed — an unrecognized prefix or a non-integer suffix —
   * so the caller can treat it exactly like a well-formed number that
   * simply doesn't exist. This is a single dispatch decision, not a
   * duplicated "flow" in the spirit of this module's split, so it stays as
   * one small pure method shared by both branches above.
   */
  private parseDisplayNumber(
    displayNumber: string,
  ): ParsedDisplayNumber | null {
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
}

const DISPLAY_NUMBER_SUFFIX_PATTERN = /^\d+$/;

type ParsedDisplayNumber = {
  kind: TicketType.ANSIBLE | TicketType.DATABASE;
  number: number;
};
