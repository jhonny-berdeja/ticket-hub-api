import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `POST /tickets/ansible` — `ticketType` is fixed to `ANSIBLE` server-side
 * (see `TicketsController.createAnsible`), never accepted from the client.
 */
export class CreateAnsibleTicketDto {
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
  @MaxLength(500)
  codeAnsible?: string;
}
