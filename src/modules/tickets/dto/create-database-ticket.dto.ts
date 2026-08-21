import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `POST /tickets/database` — `ticketType` is fixed to `DATABASE`
 * server-side (see `TicketsController.createDatabase`), never accepted
 * from the client. `operationType` was removed ecosystem-wide and never
 * comes back here.
 */
export class CreateDatabaseTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assignee: string;

  @IsString()
  @MaxLength(25)
  department: string;

  @IsString()
  @MaxLength(100)
  subject: string;

  @IsString()
  @MaxLength(200)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  namespace: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  deployment: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  dbName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  sqlCode: string;
}
