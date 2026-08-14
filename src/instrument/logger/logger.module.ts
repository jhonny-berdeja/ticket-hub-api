import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { buildLoggerOptions } from './logger.config';

/**
 * `@Global()` for the same reason as `EnvModule`/`DatabaseModule`
 * (`src/common/`): every part of the app needs to log, implicitly, so
 * `nestjs-pino`'s `Logger`/`PinoLogger` must be injectable everywhere
 * without every feature module importing this one explicitly.
 *
 * Library choice: `nestjs-pino` over Nest's built-in logger because it (1)
 * emits structured JSON by default — required for Loki/Promtail to index
 * fields like `level`/`req.id` instead of grepping plain text (see
 * `pcbox-api/documentation/pcbox.loki-deploy.md`, which flags this gap);
 * (2) replaces Nest's internal logger via `app.useLogger()`, so framework
 * messages (bootstrap, route mapping) are JSON too, not just app-level
 * logs; and (3) auto-instruments every HTTP request/response with a
 * correlation `req.id` via `pino-http`, with no extra interceptor code.
 *
 * No conditional "pretty" transport for local dev: per the README, this
 * app runs only as a Pod in the microk8s `ticket-hub` namespace, so stdout
 * always goes to Loki and JSON is always the right format.
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildLoggerOptions(configService.get<string>('LOG_LEVEL')!),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
