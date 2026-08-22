import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { KubernetesTicketsRepository } from '../../common/database/ticket/kubernetes-tickets.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';
const ADMIN_ROLE_NAME: string = Role.ADMIN;

/**
 * `TicketsService.findByNumber` extracted here because it needs its own
 * lookup-then-authorize flow. Its public entry points
 * (`findAnsibleByNumber`/`findDatabaseByNumber`/`findKubernetesByNumber`)
 * are deliberately written out in full below, NOT factored into one shared
 * generic helper, even though they're nearly identical — see
 * `project-structure-conventions.md`, "Handlers en el service general vs.
 * service dedicado". The caller now states which table to query explicitly
 * (no prefix parsing happens here), so each method queries only its own
 * table and, exactly as before, never leaks whether a "not found" was a
 * missing number or a found-but-not-authorized ticket. `isAdmin` stays as
 * one small shared free function: it's a trivial one-line auth check, not
 * a "flow".
 */
@Injectable()
export class FindTicketByNumberService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
    private readonly kubernetesTicketsRepository: KubernetesTicketsRepository,
  ) {}

  async findAnsibleByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const result = await this.findDatacenterTicketByNumber(number, user);
    if (!result) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return result;
  }

  async findDatabaseByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const result = await this.findDatabaseTicketByNumber(number, user);
    if (!result) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return result;
  }

  async findKubernetesByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    const result = await this.findKubernetesTicketByNumber(number, user);
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

  private async findKubernetesTicketByNumber(
    number: number,
    user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse> | null> {
    const ticket =
      await this.kubernetesTicketsRepository.findByNumber(number);
    if (!ticket) {
      return null;
    }

    if (!this.isAdmin(user) && ticket.informer !== user.email) {
      return null;
    }

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket found')
      .withData(TicketMapper.toKubernetesResponse(ticket))
      .build();
  }

  private isAdmin(user: AuthenticatedUser): boolean {
    return user.apps.application.roles.some(
      (role) => role.name === ADMIN_ROLE_NAME,
    );
  }
}
