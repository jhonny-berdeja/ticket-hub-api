import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthApiLoginService } from '../../common/auth-api/auth-api-login.service';

/** `POST /pcbox` (Ansible-only, per pcbox-api's split). */
export interface PcboxApiCreateAdministrationBody {
  ticketNumber: number;
  department: string;
  approver: string;
  informer: string;
  status: string;
  fileContent?: string;
}

/**
 * `POST /database` — flat body, no nested `database` object.
 * `namespace`/`deployment` are required here: pcbox-api's
 * `DbTargetValidator.assertAllowed`/`SqlPlaybookBuilder.build` need them as
 * caller-supplied input at approval time, so `database_tickets` persists
 * them (see `database-ticket.entity.ts`) and forwards them here verbatim.
 */
export interface PcboxApiCreateDatabaseActionBody {
  ticketNumber: number;
  department: string;
  approver: string;
  informer: string;
  status: string;
  namespace: string;
  deployment: string;
  dbName: string;
  sqlCode: string;
}

/**
 * `POST /kubernetes` — flat body, same shape as `createAdministration`
 * (KUBERNETES tickets carry no extra target fields, unlike DATABASE's
 * namespace/deployment/dbName).
 */
export interface PcboxApiCreateKubernetesActionBody {
  ticketNumber: number;
  department: string;
  approver: string;
  informer: string;
  status: string;
  fileContent: string;
}

/**
 * `POST /kubernetes/ansible` — same flat body shape as
 * `createKubernetesAction`, playbook-driven execution instead of applying
 * `fileContent` as a raw manifest. Routed to from
 * `PcboxApiService.sendToConnector` when the originating
 * `KubernetesTicketEntity.executionType` is `ANSIBLE` (see
 * `kubernetes-execution-type.enum.ts`).
 */
export type PcboxApiCreateKubernetesAnsibleActionBody =
  PcboxApiCreateKubernetesActionBody;

export interface DbTarget {
  namespace: string;
  deployment: string;
  dbName: string;
}

interface DbTargetsResponse {
  data: DbTarget[];
}

@Injectable()
export class PcboxApiConnector {
  /** 10s above pcbox-api's own 4-minute playbook execution timeout. */
  private static readonly REQUEST_TIMEOUT_MS = 250_000;
  private static readonly LOGIN_TIMEOUT_MS = 10_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly authApiLoginService: AuthApiLoginService,
  ) {}

  createAdministration(
    body: PcboxApiCreateAdministrationBody,
  ): Promise<Response> {
    return this.postJson('/pcbox', body);
  }

  /** `POST /database` — the DATABASE-ticket counterpart of `createAdministration`. */
  createDatabaseAction(
    body: PcboxApiCreateDatabaseActionBody,
  ): Promise<Response> {
    return this.postJson('/database', body);
  }

  /** `POST /kubernetes` — the KUBERNETES-ticket counterpart of `createAdministration`. */
  createKubernetesAction(
    body: PcboxApiCreateKubernetesActionBody,
  ): Promise<Response> {
    return this.postJson('/kubernetes', body);
  }

  /** `POST /kubernetes/ansible` — the ANSIBLE-execution counterpart of `createKubernetesAction`. */
  createKubernetesAnsibleAction(
    body: PcboxApiCreateKubernetesAnsibleActionBody,
  ): Promise<Response> {
    return this.postJson('/kubernetes/ansible', body);
  }

  /** Proxies pcbox-api's `GET /database/db-targets` — the single source of truth for the DATABASE-ticket allowlist (see design's "anti-drift" note). */
  async fetchDbTargets(): Promise<DbTarget[]> {
    const accessToken = await this.authApiLoginService.login();

    const baseUrl = this.configService.get<string>('PCBOX_API_URL')!;
    const response = await fetch(`${baseUrl}/database/db-targets`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(PcboxApiConnector.LOGIN_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch db-targets: status ${response.status}`);
    }

    const body = (await response.json()) as DbTargetsResponse;
    return body.data;
  }

  private async postJson(path: string, body: unknown): Promise<Response> {
    const accessToken = await this.authApiLoginService.login();

    const baseUrl = this.configService.get<string>('PCBOX_API_URL')!;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      PcboxApiConnector.REQUEST_TIMEOUT_MS,
    );
    try {
      return await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
