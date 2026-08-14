import { Options } from 'pino-http';

/**
 * Pure builder of the `pinoHttp` options consumed by `nestjs-pino`'s
 * `LoggerModule.forRootAsync()`, kept separate from the module wiring in
 * `logger.module.ts` — same split as `env.validation.ts` (options) vs.
 * `env.module.ts` (`ConfigModule` wiring). Not a builder-pattern class:
 * this is a config factory returning a plain options object, not an
 * entity/DTO/value object with mandatory fields.
 */
export function buildLoggerOptions(level: string): { pinoHttp: Options } {
  return {
    pinoHttp: {
      level,
      // The app runs cluster-only (see README "Environment variables"):
      // stdout always goes to Loki via Promtail, so pino's default JSON
      // transport is what we want — no conditional "pretty" mode for a
      // local dev flow that doesn't exist here.
      redact: {
        paths: [
          // pino-http logs full request/response headers by default.
          // Those end up in Loki, readable by anyone with Grafana access —
          // redact anything that carries credentials or a bearer/session
          // token so they never leave the process in plain text.
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          'req.body.password',
          'req.body.access_token',
        ],
        censor: '[REDACTED]',
      },
    },
  };
}
