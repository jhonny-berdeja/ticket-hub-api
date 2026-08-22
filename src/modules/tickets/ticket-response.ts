import { KubernetesExecutionType } from '../../common/database/ticket/kubernetes-execution-type.enum';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';

/**
 * Unified response shape across both `datacenter_tickets` and
 * `database_tickets` — `ticketType` is now purely derived by the mapper
 * from which table a ticket came from (see `TicketMapper.toAnsibleResponse`
 * / `toDatabaseResponse`), never a persisted column. `creator` is gone:
 * ownership is tracked only via `informer`.
 */
export interface TicketResponse {
  id: number;
  number: string;
  informer: string;
  assignee: string | null;
  department: string;
  subject: string;
  status: TicketStatus;
  description: string;
  ticketType: TicketType;
  codeAnsible: string | null;
  codeYaml: string | null;
  response: string | null;
  namespace: string | null;
  deployment: string | null;
  dbName: string | null;
  sqlCode: string | null;
  executionType: KubernetesExecutionType | null;
}
