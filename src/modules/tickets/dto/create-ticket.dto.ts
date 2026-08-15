import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `assignee` is mandatory (a DEV assigns it at creation — confirmed
 * product decision) and must already hold role APPROVER or ADMIN,
 * checked in TicketsService.create against the DB, not just trusted
 * from the client (the frontend only shows assignable users, but a
 * request could still be crafted by hand).
 *
 * `codeAnsible` is mandatory too, same confirmed product decision:
 * every ticket now needs a playbook, since `ApproveTicketService` always
 * sends it to pcbox-api on approval (see its own comment). Still
 * `nullable` on `TicketEntity`/the DB column, not `NOT NULL` — same
 * "business-mandatory, DB-nullable" reasoning as `assignee`: enforcing
 * it here means no migration is needed if the rule changes again later.
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  codeAnsible: string;
}
