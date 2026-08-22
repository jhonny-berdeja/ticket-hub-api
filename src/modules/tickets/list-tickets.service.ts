import { Injectable } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { KubernetesTicketsRepository } from '../../common/database/ticket/kubernetes-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const ADMIN_ROLE_NAME: string = Role.ADMIN;

/**
 * `TicketsService.findMineOrAll` consolidated here: one method per ticket
 * kind, each scoped to its own repository/mapper pair. `isAdmin` is shared
 * since it's the same trivial one-line auth check for all three.
 */
@Injectable()
export class ListTicketsService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
    private readonly kubernetesTicketsRepository: KubernetesTicketsRepository,
  ) {}

  async findAnsibleMineOrAll(
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

  async findDatabaseMineOrAll(
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

  async findKubernetesMineOrAll(
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    const tickets = this.isAdmin(user)
      ? await this.kubernetesTicketsRepository.findAll()
      : await this.kubernetesTicketsRepository.findByInformer(user.email);

    return ResponseBody.builder<TicketResponse[]>()
      .withMsg('Tickets retrieved successfully')
      .withData(
        tickets.map((ticket) => TicketMapper.toKubernetesResponse(ticket)),
      )
      .build();
  }

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.apps.application.roles.some(
      (role) => role.name === ADMIN_ROLE_NAME,
    );
  }
}
