import { Injectable } from '@nestjs/common';
import { DatacenterTicketEntity } from '../../common/database/ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from '../../common/database/ticket/database-ticket.entity';
import { DbTarget, PcboxApiConnector } from './pcbox-api.connector';

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

  async notifyApproval(
    ticket: DatacenterTicketEntity | DatabaseTicketEntity,
  ): Promise<string> {
    if (ticket.assignee === null) {
      return UNASSIGNED_MESSAGE;
    }

    try {
      const response = await this.sendToConnector(ticket, ticket.assignee);
      return await this.describeResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `pcbox-api unreachable: ${message}`;
    }
  }

  /** Proxied by `TicketsController` at `GET /tickets/db-targets` — see design's "anti-drift" note (one source of truth in pcbox-api). */
  fetchDbTargets(): Promise<DbTarget[]> {
    return this.pcboxApiConnector.fetchDbTargets();
  }

  /**
   * Routes to the right pcbox-api endpoint/body shape depending on which
   * table `ticket` came from — pcbox-api split `POST /pcbox`
   * (Ansible-only) from `POST /database` (flat DATABASE body, no nested
   * `database` object). There is no `ticketType` column anymore, so the
   * entity's own class stands in for the old discriminator.
   */
  private sendToConnector(
    ticket: DatacenterTicketEntity | DatabaseTicketEntity,
    assignee: string,
  ): Promise<Response> {
    const base = {
      ticketNumber: ticket.number,
      department: ticket.department,
      informer: ticket.informer,
      approver: assignee,
      status: ticket.status,
    };

    if (ticket instanceof DatabaseTicketEntity) {
      return this.pcboxApiConnector.createDatabaseAction({
        ...base,
        namespace: ticket.dbNamespace ?? '',
        deployment: ticket.dbDeployment ?? '',
        dbName: ticket.dbName ?? '',
        sqlCode: ticket.sqlCode ?? '',
      });
    }

    return this.pcboxApiConnector.createAdministration({
      ...base,
      fileContent: ticket.codeAnsible ?? '',
    });
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
