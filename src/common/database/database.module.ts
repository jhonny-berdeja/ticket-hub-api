import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user/user.entity';
import { UsersRepository } from './user/users.repository';
import { RoleEntity } from './role/role.entity';
import { RolesRepository } from './role/roles.repository';

/**
 * `EnvModule` is not imported here: it's `@Global()` too, so once it loads
 * in `AppModule`, `ConfigService` is already injectable everywhere —
 * `inject: [ConfigService]` below works without a local import, same reason
 * `UsersModule`/`AuthModule` don't import this module to get `UsersRepository`.
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
        entities: [UserEntity, RoleEntity],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
  ],
  providers: [UsersRepository, RolesRepository],
  exports: [UsersRepository, RolesRepository, TypeOrmModule],
})
export class DatabaseModule {}
