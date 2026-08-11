import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

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
        entities: [User],
        // The schema is an immutable baseline created once by the
        // ticket-hub-db-init ConfigMap; the app must never create,
        // alter, or drop tables.
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersRepository],
  exports: [UsersRepository, TypeOrmModule],
})
export class DatabaseModule {}
