import { Injectable } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const ADMIN_ROLE_NAME: string = Role.ADMIN;

/**
 * `TicketsService.findMineOrAll` extracted here, scoped to
 * `datacenter_tickets` alone — deliberately NOT shared with
 * `ListDatabaseTicketsService` even though the two are nearly identical,
 * so each list flow can be read and changed in isolation. See
 * `project-structure-conventions.md`, "Handlers en el service general vs.
 * service dedicado".
 */
@Injectable()
export class ListAnsibleTicketsService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
  ) {}

  async findMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const tickets = this.isAdmin(user)
      ? await this.datacenterTicketsRepository.findAll()
      : await this.datacenterTicketsRepository.findByInformer(user.email);

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(tickets.map((ticket) => TicketMapper.toAnsibleResponse(ticket)))
      .build();
  }

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.apps.application.roles.some(
      (role) => role.name === ADMIN_ROLE_NAME,
    );
  }
}
