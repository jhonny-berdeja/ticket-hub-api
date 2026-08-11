import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';

/** `number` is the display form ("TK-5") — the entity's plain integer, prefixed. */
export interface TicketResponse {
  id: number;
  number: string;
  creator: number;
  assignee: number | null;
  department: string;
  subject: string;
  status: TicketStatus;
  description: string;
  codeAnsible: string | null;
}
