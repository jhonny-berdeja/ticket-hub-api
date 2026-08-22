import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `POST /tickets/kubernetes` — `ticketType` is fixed to `KUBERNETES`
 * server-side (see `TicketsController.createKubernetes`), never accepted
 * from the client.
 */
export class CreateKubernetesTicketDto {
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
  codeYaml?: string;
}
