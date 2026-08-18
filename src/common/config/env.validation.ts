import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';

/** Valid pino log levels, in ascending severity order. */
const PINO_LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;

/**
 * Every container env var the app needs, all mandatory. `DATABASE_PORT`/
 * `PORT` are validated as numeric strings since they're `parseInt`'d /
 * passed to `app.listen()` downstream — a non-numeric value should fail
 * here, not there.
 */
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
   * Shared secret sent as `x-admin-api-key` when calling pcbox-api —
   * must hold the exact same value as pcbox-api's own `ADMIN_API_KEY`.
   * Provisioned as a separate Secret in this namespace (Kubernetes
   * Secrets don't cross namespaces) — see pcbox-api's own
   * documentation/pcbox.ticket-hub-db-deploy.md, step 9 (deploy docs for
   * the whole ecosystem live in that repo, not here).
   */
  @IsString()
  @IsNotEmpty()
  PCBOX_API_ADMIN_KEY!: string;
}

/**
 * Fail-fast environment validation.
 *
 * The app runs cluster-only: every value below arrives as a container env
 * var injected by the Deployment/Secret, never a `.env` file. Throwing here
 * stops the process at boot instead of silently falling back to defaults
 * like `localhost`.
 */
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
