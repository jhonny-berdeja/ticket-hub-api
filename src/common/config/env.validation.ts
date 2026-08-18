import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';

const PINO_LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  POSTGRES_USER!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsNumberString()
  DATABASE_PORT!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  /**
   * In-cluster base URL of auth-api, e.g.
   * `http://auth-api.auth-api.svc.cluster.local:3000` -- `JwksClientService`
   * polls `${AUTH_API_URL}/.well-known/jwks.json` every 5 minutes to
   * refresh the RS256 key `JwtAuthGuard` verifies every token against.
   */
  @IsString()
  @IsNotEmpty()
  AUTH_API_URL!: string;

  @IsNumberString()
  PORT!: string;

  @IsIn(PINO_LOG_LEVELS)
  LOG_LEVEL!: string;

  /**
   * Base URL of pcbox-api's `POST /pcbox`, e.g.
   * `http://pcbox-api.pcbox-api.svc.cluster.local:3000` — in-cluster
   * DNS, never a public address. Not `@IsUrl()`: that validator requires
   * a public-looking TLD and rejects `*.svc.cluster.local` hostnames.
   */
  @IsString()
  @IsNotEmpty()
  PCBOX_API_URL!: string;

  /**
   * The application PcboxApiConnector logs into on auth-api
   * (`X-Application-Name`) before calling pcbox-api -- must match
   * whatever pcbox-api was registered as in auth-api's `applications`
   * table (see the data migration in iam).
   */
  @IsString()
  @IsNotEmpty()
  PCBOX_API_APPLICATION_NAME!: string;

  /**
   * apps-user credentials (`clienteId`/`clienteSecret`) PcboxApiConnector
   * logs in with against auth-api's `POST /apps-users/login`, replacing
   * the old shared `PCBOX_API_ADMIN_KEY` -- see the connector's own
   * history. Both provisioned from the same Secret.
   */
  @IsString()
  @IsNotEmpty()
  PCBOX_API_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  PCBOX_API_CLIENT_SECRET!: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const invalid = errors.map((error) => error.property).join(', ');
    throw new Error(`Missing required environment variable(s): ${invalid}`);
  }

  return validatedConfig;
}
