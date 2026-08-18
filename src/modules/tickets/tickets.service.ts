import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';
// Widened to `string` so it can be compared against `RolePayload.name`
// (a plain string on the auth-api-issued token) without the enum
// comparison ESLint flags.
const ADMIN_ROLE_NAME: string = Role.ADMIN;

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  /**
   * `assignee` is free text now, typed manually — no role/DB validation
   * against it anymore (see CreateTicketDto's doc comment). `informer`
   * is the creator's email, read straight off the auth-api-issued token
   * by the caller (TicketsController.create), not looked up here.
   */
  async create(
    dto: CreateTicketDto,
    creator: number,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    // Not DB-generated (see TicketEntity's doc comment for why) — max+1
    // has a tiny theoretical race window between two concurrent creates,
    // accepted given ticket creation is a low-frequency, human-initiated
    // action, not a hot path.
    const maxNumber = await this.ticketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toEntity(
      dto,
      creator,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.ticketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toResponse(createdTicket))
      .build();
  }

  /** Non-ADMIN sees only tickets they created; ADMIN sees every ticket. */
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

  /**
   * Powers the header search bar. A non-ADMIN can only find their own
   * tickets this way too - a ticket that exists but isn't theirs and
   * isn't visible to them comes back as 404, same "don't confirm what
   * exists" reasoning as login's generic invalid-credentials message.
   */
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
}

function isAdmin(user: AuthenticatedUser): boolean {
  return user.apps.application.roles.some(
    (role) => role.name === ADMIN_ROLE_NAME,
  );
}
