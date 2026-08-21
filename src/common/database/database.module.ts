import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatacenterTicketEntity } from './ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from './ticket/database-ticket.entity';
import { DatacenterTicketsRepository } from './ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from './ticket/database-tickets.repository';

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
        entities: [DatacenterTicketEntity, DatabaseTicketEntity],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([DatacenterTicketEntity, DatabaseTicketEntity]),
  ],
  providers: [DatacenterTicketsRepository, DatabaseTicketsRepository],
  exports: [
    DatacenterTicketsRepository,
    DatabaseTicketsRepository,
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
