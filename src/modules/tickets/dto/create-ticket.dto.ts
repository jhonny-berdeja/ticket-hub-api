import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `assignee` is mandatory (a DEV assigns it at creation — confirmed
 * product decision) and must already hold role APPROVER or ADMIN,
 * checked in TicketsService.create against the DB, not just trusted
 * from the client (the frontend only shows assignable users, but a
 * request could still be crafted by hand).
 *
 * Field limits mirror the immutable `tickets` table column widths
 * (`department` VARCHAR(25), `subject` VARCHAR(100), `description`
 * VARCHAR(200), `code_ansible` VARCHAR(500)).
 */
export class CreateTicketDto {
  @IsInt()
  assignee: number;

  @IsString()
  @MaxLength(25)
  department: string;

  @IsString()
  @MaxLength(100)
  subject: string;

  @IsString()
  @MaxLength(200)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  codeAnsible?: string;
}
