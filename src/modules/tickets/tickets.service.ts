import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const ASSIGNABLE_ROLES: Role[] = [Role.APPROVER, Role.ADMIN];
// Same role names as ASSIGNABLE_ROLES, just widened to `string[]` so
// they can be compared against `RolePayload.name` (a plain string on
// the auth-api-issued token) without a type error.
const ASSIGNABLE_ROLE_NAMES: string[] = ASSIGNABLE_ROLES;
const INVALID_ASSIGNEE_MESSAGE =
  'assignee must be a user with role APPROVER or ADMIN';
const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async create(
    dto: CreateTicketDto,
    creator: number,
  ): Promise<ResponseBody<TicketResponse>> {
    const assigneeRoles = await this.rolesRepository.findByUserId(dto.assignee);
    const assigneeIsApprover = assigneeRoles.some((role) =>
      ASSIGNABLE_ROLES.includes(role.rol),
    );
    if (!assigneeIsApprover) {
      throw new BadRequestException(INVALID_ASSIGNEE_MESSAGE);
    }

    // Not DB-generated (see TicketEntity's doc comment for why) — max+1
    // has a tiny theoretical race window between two concurrent creates,
    // accepted given ticket creation is a low-frequency, human-initiated
    // action, not a hot path.
    const maxNumber = await this.ticketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toEntity(dto, creator, nextNumber);
    const createdTicket =
      await this.ticketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toResponse(createdTicket))
      .build();
  }

  /** DEV sees only tickets they created; APPROVER/ADMIN see every ticket — same product decision as the users list, just role-branched instead of role-gated. */
  async findMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const canViewAll = user.apps.application.roles.some((role) =>
      ASSIGNABLE_ROLE_NAMES.includes(role.name),
    );

    const tickets = canViewAll
      ? await this.ticketsRepository.findAll()
      : await this.ticketsRepository.findByCreator(user.sub);

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(tickets.map((ticket) => TicketMapper.toResponse(ticket)))
      .build();
  }

  /**
   * Powers the header search bar. A DEV can only find their own tickets
   * this way too - a ticket that exists but isn't theirs and isn't
   * visible to them comes back as 404, same "don't confirm what exists"
   * reasoning as login's generic invalid-credentials message.
   */
  async findByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const ticket = await this.ticketsRepository.findByNumber(number);
    const canViewAll = user.apps.application.roles.some((role) =>
      ASSIGNABLE_ROLE_NAMES.includes(role.name),
    );

    if (!ticket || (!canViewAll && ticket.creator !== user.sub)) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(TicketMapper.toResponse(ticket))
      .build();
  }
}
