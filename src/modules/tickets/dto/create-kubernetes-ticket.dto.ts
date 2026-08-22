import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { KubernetesExecutionType } from '../../../common/database/ticket/kubernetes-execution-type.enum';

/**
 * `POST /tickets/kubernetes` — `ticketType` is fixed to `KUBERNETES`
 * server-side (see `TicketsController.createKubernetes`), never accepted
 * from the client. `executionType`, on the other hand, IS caller-supplied:
 * it decides which pcbox-api endpoint approval will hit (see
 * `PcboxApiService.sendToConnector`), and that's a choice the requester
 * makes when filing the ticket, not something derivable server-side.
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

  @IsEnum(KubernetesExecutionType)
  executionType: KubernetesExecutionType;
}
