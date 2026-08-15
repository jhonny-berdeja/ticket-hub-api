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

/**
 * Owns the raw HTTP connection to pcbox-api's `POST /pcbox` — a shared
 * secret (`x-admin-api-key`), not a login: pcbox-api has no user auth of
 * its own, see its `AdminApiKeyGuard`. One public method, no caching, no
 * retry — a single request per call, same "no token/connection state
 * held between calls" reasoning as pcbox-api's own
 * `TicketHubApiConnector` (before it got removed) used calling this API.
 * `PcboxApiService` (this module's public API from the outside) owns
 * everything *around* this: what to send, what the response means. Kept
 * separate so tests can mock this one connection-level concern instead of
 * the whole module — same split as `AnsibleConnector`/`AnsibleService`
 * and `TicketHubApiConnector`/`TicketHubVerificationService` in pcbox-api.
 */
@Injectable()
export class PcboxApiConnector {
  private static readonly REQUEST_TIMEOUT_MS = 5_000;
  private static readonly API_KEY_HEADER = 'x-admin-api-key';

  constructor(private readonly configService: ConfigService) {}

  async createAdministration(
    body: PcboxApiCreateAdministrationBody,
  ): Promise<Response> {
    const baseUrl = this.configService.get<string>('PCBOX_API_URL')!;
    const adminApiKey = this.configService.get<string>('PCBOX_API_ADMIN_KEY')!;

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
          [PcboxApiConnector.API_KEY_HEADER]: adminApiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
