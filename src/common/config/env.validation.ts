import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsNumberString()
  PORT!: string;
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
