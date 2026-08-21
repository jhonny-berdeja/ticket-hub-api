import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';

export interface TicketResponse {
  id: number;
  number: string;
  creator: number;
  informer: string;
  assignee: string | null;
  department: string;
  subject: string;
  status: TicketStatus;
  description: string;
  ticketType: TicketType;
  codeAnsible: string | null;
  response: string | null;
  namespace: string | null;
  deployment: string | null;
  dbName: string | null;
  sqlCode: string | null;
}
