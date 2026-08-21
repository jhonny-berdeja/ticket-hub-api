import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthApiLoginService } from '../../common/auth-api/auth-api-login.service';

/** Bare shape iam-api's `GET /internal-users` returns — no `ResponseBody` envelope, unlike this repo's own convention. */
export interface InternalUser {
  id: number;
  name: string;
  lastname: string;
  email: string;
}

@Injectable()
export class IamApiConnector {
  private static readonly REQUEST_TIMEOUT_MS = 10_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly authApiLoginService: AuthApiLoginService,
  ) {}

  /** `GET /internal-users?applicationName=...&roleName=...` on iam-api (served off `AUTH_API_URL`). */
  async fetchInternalUsers(
    applicationName: string,
    roleName: string,
  ): Promise<InternalUser[]> {
    const accessToken = await this.authApiLoginService.login();
    const authApiUrl = this.configService.get<string>('AUTH_API_URL')!;

    // Plain string URL, like every other fetch call in this app — never a
    // `URL`/`Request` instance (see `PcboxApiConnector`).
    const query = new URLSearchParams({ applicationName, roleName });
    const url = `${authApiUrl}/internal-users?${query.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(IamApiConnector.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch internal-users: status ${response.status}`,
      );
    }

    return (await response.json()) as InternalUser[];
  }
}
