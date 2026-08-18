import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Mirrors pcbox-api's own `CreatePcboxDto` — this repo doesn't import that type directly, no cross-repo dependency, just the same shape by agreement between the two APIs. */
export interface PcboxApiCreateAdministrationBody {
  ticketNumber: number;
  department: string;
  approver: string;
  informer: string;
  status: string;
  fileContent: string;
}

interface AuthApiLoginResponse {
  access_token: string;
}

const LOGIN_FAILED_MESSAGE = 'Failed to authenticate with auth-api';

/**
 * Owns the raw HTTP connection to pcbox-api's `POST /pcbox`. No more
 * shared secret (`x-admin-api-key`) -- pcbox-api verifies a bearer
 * token via auth-api's JWKS now (see its own history), so this app
 * authenticates as its own apps-user first
 * (`POST /apps-users/login`, `X-Application-Name: pcbox-api`) and sends
 * the resulting token as `Authorization: Bearer`. No caching: a fresh
 * login runs before every call, same "no token/connection state held
 * between calls" reasoning as before -- approval is a low-frequency,
 * human-initiated action, not a hot path, so the extra round trip costs
 * nothing worth optimizing away. `PcboxApiService` (this module's
 * public API from the outside) owns everything *around* this: what to
 * send, what the response means. Kept separate so tests can mock this
 * one connection-level concern instead of the whole module — same
 * split as `AnsibleConnector`/`AnsibleService` and
 * `TicketHubApiConnector`/`TicketHubVerificationService` in pcbox-api.
 */
@Injectable()
export class PcboxApiConnector {
  // POST /pcbox doesn't respond until the whole playbook run finishes —
  // pcbox-api's own AnsibleConnector allows up to 120s for that
  // (PLAYBOOK_TIMEOUT_MS). This has to be at least that long plus some
  // margin for network/processing overhead, or every real playbook run
  // gets aborted here before pcbox-api ever gets to answer — found the
  // hard way: a short playbook still timed out at the old 5s value,
  // landing "pcbox-api unreachable: This operation was aborted" in
  // every ticket's `response`, every time.
  private static readonly REQUEST_TIMEOUT_MS = 130_000;
  private static readonly LOGIN_TIMEOUT_MS = 10_000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Never rejects with pcbox-api's own error shape -- an auth-api
   * failure here throws a plain `Error`, which `PcboxApiService.notifyApproval`'s
   * try/catch already turns into a "pcbox-api unreachable: ..." message,
   * same as any other connection failure.
   */
  async createAdministration(
    body: PcboxApiCreateAdministrationBody,
  ): Promise<Response> {
    const accessToken = await this.login();

    const baseUrl = this.configService.get<string>('PCBOX_API_URL')!;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      PcboxApiConnector.REQUEST_TIMEOUT_MS,
    );
    try {
      return await fetch(`${baseUrl}/pcbox`, {
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

  private async login(): Promise<string> {
    const authApiUrl = this.configService.get<string>('AUTH_API_URL')!;
    const applicationName = this.configService.get<string>(
      'PCBOX_API_APPLICATION_NAME',
    )!;
    const clienteId = this.configService.get<string>('PCBOX_API_CLIENT_ID')!;
    const clienteSecret = this.configService.get<string>(
      'PCBOX_API_CLIENT_SECRET',
    )!;

    const response = await fetch(`${authApiUrl}/apps-users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Application-Name': applicationName,
      },
      body: JSON.stringify({ clienteId, clienteSecret }),
      signal: AbortSignal.timeout(PcboxApiConnector.LOGIN_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${LOGIN_FAILED_MESSAGE}: status ${response.status}`);
    }

    const { access_token: accessToken } =
      (await response.json()) as AuthApiLoginResponse;
    return accessToken;
  }
}
