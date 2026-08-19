import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TicketType } from '../../../common/database/ticket/ticket-type.enum';
import { OperationType } from '../../../common/database/ticket/operation-type.enum';

const TICKET_TYPES = Object.values(TicketType);
const OPERATION_TYPES = Object.values(OperationType);

export class CreateTicketDto {
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

  /** Optional for rollout: omitted requests are treated as ANSIBLE (see TicketMapper). */
  @IsOptional()
  @IsIn(TICKET_TYPES)
  ticketType?: TicketType;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType !== TicketType.DATABASE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  codeAnsible?: string;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType === TicketType.DATABASE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  namespace?: string;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType === TicketType.DATABASE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  deployment?: string;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType === TicketType.DATABASE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(63)
  dbName?: string;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType === TicketType.DATABASE)
  @IsIn(OPERATION_TYPES)
  operationType?: OperationType;

  @ValidateIf((dto: CreateTicketDto) => dto.ticketType === TicketType.DATABASE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  sqlCode?: string;
}
