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

@Injectable()
export class PcboxApiService {
  constructor(private readonly pcboxApiConnector: PcboxApiConnector) {}

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
