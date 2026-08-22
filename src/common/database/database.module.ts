import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatacenterTicketEntity } from './ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from './ticket/database-ticket.entity';
import { KubernetesTicketEntity } from './ticket/kubernetes-ticket.entity';
import { DatacenterTicketsRepository } from './ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from './ticket/database-tickets.repository';
import { KubernetesTicketsRepository } from './ticket/kubernetes-tickets.repository';

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
        entities: [
          DatacenterTicketEntity,
          DatabaseTicketEntity,
          KubernetesTicketEntity,
        ],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([
      DatacenterTicketEntity,
      DatabaseTicketEntity,
      KubernetesTicketEntity,
    ]),
  ],
  providers: [
    DatacenterTicketsRepository,
    DatabaseTicketsRepository,
    KubernetesTicketsRepository,
  ],
  exports: [
    DatacenterTicketsRepository,
    DatabaseTicketsRepository,
    KubernetesTicketsRepository,
    TypeOrmModule,
  ],
})
export class DatabaseModule {}
