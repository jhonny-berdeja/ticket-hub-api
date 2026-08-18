import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './ticket/ticket.entity';
import { TicketsRepository } from './ticket/tickets.repository';

/**
 * `EnvModule` is not imported here: it's `@Global()` too, so once it loads
 * in `AppModule`, `ConfigService` is already injectable everywhere —
 * `inject: [ConfigService]` below works without a local import, same reason
 * `AuthModule` doesn't import this module to get `TicketsRepository`.
 *
 * `UserEntity`/`RoleEntity`/`UsersRepository`/`RolesRepository` are gone --
 * ticket-hub authenticates against auth-api now (JwtAuthGuard verifies
 * via JWKS), and the local `users`/`roles` tables had no other consumer
 * left once `TicketsService`'s assignee-role check and `PcboxApiService`'s
 * name lookups were retired (see `TicketEntity`'s doc comment for the
 * full history). The tables themselves are dropped by a migration, not
 * this module -- see pcbox-api/documentation/pcbox.ticket-hub-db-deploy.md §11.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(
          configService.get<string>('DATABASE_PORT') ?? '5432',
          10,
        ),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [TicketEntity],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([TicketEntity]),
  ],
  providers: [TicketsRepository],
  exports: [TicketsRepository, TypeOrmModule],
})
export class DatabaseModule {}
