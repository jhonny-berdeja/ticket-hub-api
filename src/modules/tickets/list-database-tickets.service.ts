import { Injectable } from '@nestjs/common';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const ADMIN_ROLE_NAME: string = Role.ADMIN;

/**
 * `TicketsService.findMineOrAll` extracted here, scoped to
 * `database_tickets` alone — deliberately NOT shared with
 * `ListAnsibleTicketsService` even though the two are nearly identical,
 * so each list flow can be read and changed in isolation. See
 * `project-structure-conventions.md`, "Handlers en el service general vs.
 * service dedicado".
 */
@Injectable()
export class ListDatabaseTicketsService {
  constructor(
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
  ) {}

  async findMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const tickets = this.isAdmin(user)
      ? await this.databaseTicketsRepository.findAll()
      : await this.databaseTicketsRepository.findByInformer(user.email);

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(
        tickets.map((ticket) => TicketMapper.toDatabaseResponse(ticket)),
      )
      .build();
  }

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.apps.application.roles.some(
      (role) => role.name === ADMIN_ROLE_NAME,
    );
  }
}
