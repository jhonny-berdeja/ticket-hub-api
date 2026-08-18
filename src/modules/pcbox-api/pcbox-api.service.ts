import { Injectable } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import {
  PcboxApiConnector,
  PcboxApiCreateAdministrationBody,
} from './pcbox-api.connector';

const UNASSIGNED_MESSAGE = 'pcbox-api not notified: ticket has no assignee';

interface PcboxApiSuccessBody {
  msg: string;
  data: {
    execution: {
      success: boolean;
      exitCode: number | null;
      stdout: string;
      stderr: string;
    };
  };
}

interface PcboxApiErrorBody {
  message: string | string[];
}

/**
 * Owns the *decision* around notifying pcbox-api once a ticket is
 * approved: what `informer`/`approver` resolve to, what to send, and how
 * to turn whatever comes back into the string that ends up in
 * `TicketEntity.response` — the complete `msg` + execution outcome +
 * stdout/stderr on success, a failure description otherwise. Never a
 * thrown exception, since a failed notification must never block the
 * approval itself (confirmed product decision, see
 * `ApproveTicketService`). `PcboxApiConnector` owns only the HTTP
 * mechanics (see its own comment).
 *
 * `informer`/`approver` are read straight off the ticket
 * (`TicketEntity.informer`/`.assignee`, both plain strings captured at
 * creation time) — no user lookup anymore, since there's no local
 * `users` table left to look anyone up in (see `TicketEntity`'s doc
 * comment for the full history).
 *
 * `department` is sent as-is even though `tickets.department` allows up
 * to 25 characters and pcbox-api's own `CreatePcboxDto.department` caps
 * at 15 — a department longer than 15 characters makes pcbox-api reject
 * the request (400), which this service treats like any other failure:
 * recorded in `response`, approval still succeeds. Known, pre-existing
 * width mismatch between the two schemas, not something this module
 * papers over.
 */
@Injectable()
export class PcboxApiService {
  constructor(private readonly pcboxApiConnector: PcboxApiConnector) {}

  /** Always resolves — never rejects. The returned string is exactly what `ApproveTicketService` should persist as `TicketEntity.response`. */
  async notifyApproval(ticket: TicketEntity): Promise<string> {
    const body = this.buildRequestBody(ticket);
    if (!body) {
      return UNASSIGNED_MESSAGE;
    }

    try {
      const response = await this.pcboxApiConnector.createAdministration(body);
      return await this.describeResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `pcbox-api unreachable: ${message}`;
    }
  }

  private buildRequestBody(
    ticket: TicketEntity,
  ): PcboxApiCreateAdministrationBody | null {
    if (ticket.assignee === null) {
      return null;
    }

    return {
      ticketNumber: ticket.number,
      department: ticket.department,
      informer: ticket.informer,
      approver: ticket.assignee,
      status: ticket.status,
      fileContent: ticket.codeAnsible ?? '',
    };
  }

  private async describeResponse(response: Response): Promise<string> {
    if (response.status === 201) {
      const body = (await response.json()) as PcboxApiSuccessBody;
      const { success, exitCode, stdout, stderr } = body.data.execution;
      return [
        `${body.msg} (execution: success=${success}, exitCode=${exitCode})`,
        '--- stdout ---',
        stdout,
        '--- stderr ---',
        stderr,
      ].join('\n');
    }

    const message = await this.extractErrorMessage(response);
    return `pcbox-api request failed with status ${response.status}${message ? `: ${message}` : ''}`;
  }

  /** Best-effort — an unparseable/missing body just means the status-only message above is all we get. */
  private async extractErrorMessage(
    response: Response,
  ): Promise<string | null> {
    try {
      const body = (await response.json()) as PcboxApiErrorBody;
      return Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
    } catch {
      return null;
    }
  }
}
