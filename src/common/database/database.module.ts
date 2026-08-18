import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketEntity } from './ticket/ticket.entity';
import { TicketsRepository } from './ticket/tickets.repository';

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
