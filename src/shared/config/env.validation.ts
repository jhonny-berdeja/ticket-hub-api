const REQUIRED_ENV_VARS = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'JWT_SECRET',
  'PORT',
] as const;

export interface EnvironmentVariables {
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  DATABASE_HOST: string;
  DATABASE_PORT: string;
  DATABASE_NAME: string;
  JWT_SECRET: string;
  PORT: string;
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
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  return config as unknown as EnvironmentVariables;
}
