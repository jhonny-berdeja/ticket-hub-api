import { DatacenterTicketEntity } from '../../common/database/ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from '../../common/database/ticket/database-ticket.entity';
import { KubernetesTicketEntity } from '../../common/database/ticket/kubernetes-ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { CreateKubernetesTicketDto } from './dto/create-kubernetes-ticket.dto';
import { TicketResponse } from './ticket-response';

/**
 * Each table now has its own independent `number` sequence (see
 * `ticket-hub-db.md`), so the display number needs a per-kind prefix —
 * otherwise a datacenter ticket and a database ticket sharing the same
 * bare `number` would be indistinguishable to a client. `KB-` is the
 * KUBERNETES counterpart — the frontend (a separate repo) must use this
 * exact prefix too.
 */
export const DATACENTER_NUMBER_DISPLAY_PREFIX = 'DC-';
export const DATABASE_NUMBER_DISPLAY_PREFIX = 'DB-';
export const KUBERNETES_NUMBER_DISPLAY_PREFIX = 'KB-';

export class TicketMapper {
  /** `POST /tickets/ansible` — the only write allowed to set ANSIBLE fields. */
  static toAnsibleEntity(
    dto: CreateAnsibleTicketDto,
    informer: string,
    number: number,
  ): DatacenterTicketEntity {
    return DatacenterTicketEntity.builder()
      .withNumber(number)
      .withInformer(informer)
      .withAssignee(dto.assignee)
      .withDepartment(dto.department)
      .withSubject(dto.subject)
      .withStatus(TicketStatus.CREATED)
      .withDescription(dto.description)
      .withCodeAnsible(dto.codeAnsible ?? null)
      .build();
  }

  /** `POST /tickets/database` — the only write allowed to set DATABASE fields. */
  static toDatabaseEntity(
    dto: CreateDatabaseTicketDto,
    informer: string,
    number: number,
  ): DatabaseTicketEntity {
    return DatabaseTicketEntity.builder()
      .withNumber(number)
      .withInformer(informer)
      .withAssignee(dto.assignee)
      .withDepartment(dto.department)
      .withSubject(dto.subject)
      .withStatus(TicketStatus.CREATED)
      .withDescription(dto.description)
      .withDbNamespace(dto.namespace)
      .withDbDeployment(dto.deployment)
      .withDbName(dto.dbName)
      .withSqlCode(dto.sqlCode)
      .build();
  }

  /** `POST /tickets/kubernetes` — the only write allowed to set KUBERNETES fields. */
  static toKubernetesEntity(
    dto: CreateKubernetesTicketDto,
    informer: string,
    number: number,
  ): KubernetesTicketEntity {
    return KubernetesTicketEntity.builder()
      .withNumber(number)
      .withInformer(informer)
      .withAssignee(dto.assignee)
      .withDepartment(dto.department)
      .withSubject(dto.subject)
      .withStatus(TicketStatus.CREATED)
      .withDescription(dto.description)
      .withCodeYaml(dto.codeYaml ?? null)
      .withExecutionType(dto.executionType)
      .build();
  }

  /**
   * `ticketType` is derived here (`ANSIBLE`), not read off the entity —
   * `datacenter_tickets` carries no discriminator column anymore, the
   * table itself is the discriminator.
   */
  static toAnsibleResponse(ticket: DatacenterTicketEntity): TicketResponse {
    return {
      id: ticket.id,
      number: `${DATACENTER_NUMBER_DISPLAY_PREFIX}${ticket.number}`,
      informer: ticket.informer,
      assignee: ticket.assignee,
      department: ticket.department,
      subject: ticket.subject,
      status: ticket.status,
      description: ticket.description,
      ticketType: TicketType.ANSIBLE,
      codeAnsible: ticket.codeAnsible,
      codeYaml: null,
      response: ticket.response,
      namespace: null,
      deployment: null,
      dbName: null,
      sqlCode: null,
      executionType: null,
    };
  }

  /** Same as `toAnsibleResponse`, mirrored for `database_tickets`. */
  static toDatabaseResponse(ticket: DatabaseTicketEntity): TicketResponse {
    return {
      id: ticket.id,
      number: `${DATABASE_NUMBER_DISPLAY_PREFIX}${ticket.number}`,
      informer: ticket.informer,
      assignee: ticket.assignee,
      department: ticket.department,
      subject: ticket.subject,
      status: ticket.status,
      description: ticket.description,
      ticketType: TicketType.DATABASE,
      codeAnsible: null,
      codeYaml: null,
      response: ticket.response,
      namespace: ticket.dbNamespace,
      deployment: ticket.dbDeployment,
      dbName: ticket.dbName,
      sqlCode: ticket.sqlCode,
      executionType: null,
    };
  }

  /** Same as `toAnsibleResponse`, mirrored for `kubernetes_tickets`. */
  static toKubernetesResponse(ticket: KubernetesTicketEntity): TicketResponse {
    return {
      id: ticket.id,
      number: `${KUBERNETES_NUMBER_DISPLAY_PREFIX}${ticket.number}`,
      informer: ticket.informer,
      assignee: ticket.assignee,
      department: ticket.department,
      subject: ticket.subject,
      status: ticket.status,
      description: ticket.description,
      ticketType: TicketType.KUBERNETES,
      codeAnsible: null,
      codeYaml: ticket.codeYaml,
      response: ticket.response,
      namespace: null,
      deployment: null,
      dbName: null,
      sqlCode: null,
      executionType: ticket.executionType,
    };
  }
}
