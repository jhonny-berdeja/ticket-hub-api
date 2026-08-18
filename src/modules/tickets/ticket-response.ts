import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';

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
  codeAnsible: string | null;
  response: string | null;
}
