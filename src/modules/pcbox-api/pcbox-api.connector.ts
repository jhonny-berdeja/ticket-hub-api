import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class PcboxApiConnector {
  private static readonly REQUEST_TIMEOUT_MS = 130_000;
  private static readonly LOGIN_TIMEOUT_MS = 10_000;

  constructor(private readonly configService: ConfigService) {}

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
