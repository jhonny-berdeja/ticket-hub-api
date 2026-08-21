import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AuthApiLoginResponse {
  access_token: string;
}

const LOGIN_FAILED_MESSAGE = 'Failed to authenticate with auth-api';

/**
 * Shared login against auth-api's `POST /apps-users/login` — extracted out
 * of `PcboxApiConnector` (its original, and until now only, home) so
 * `IamApiConnector` can authenticate against auth-api the exact same way
 * instead of duplicating this logic. Both connectors log in as the same
 * apps-user (`PCBOX_API_APPLICATION_NAME`/`PCBOX_API_CLIENT_ID`/
 * `PCBOX_API_CLIENT_SECRET`) regardless of which downstream API
 * (pcbox-api or iam-api) the caller is about to talk to — no new env vars
 * were introduced for iam-api, this app has a single registered
 * application/credential pair in auth-api.
 */
@Injectable()
export class AuthApiLoginService {
  private static readonly LOGIN_TIMEOUT_MS = 10_000;

  constructor(private readonly configService: ConfigService) {}

  async login(): Promise<string> {
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
      signal: AbortSignal.timeout(AuthApiLoginService.LOGIN_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${LOGIN_FAILED_MESSAGE}: status ${response.status}`);
    }

    const { access_token: accessToken } =
      (await response.json()) as AuthApiLoginResponse;
    return accessToken;
  }
}
