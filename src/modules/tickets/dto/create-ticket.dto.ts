import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `assignee` is mandatory (confirmed product decision) but free text
 * now, typed manually by whoever creates the ticket — no role/DB check
 * against it anymore, since there's no local `users` table left to
 * validate against (see `TicketEntity`'s doc comment for the full
 * history). `codeAnsible` is mandatory too, same confirmed product
 * decision: every ticket now needs a playbook, since
 * `ApproveTicketService` always sends it to pcbox-api on approval (see
 * its own comment). Still `nullable` on `TicketEntity`/the DB column,
 * not `NOT NULL` — same "business-mandatory, DB-nullable" reasoning as
 * `assignee`: enforcing it here means no migration is needed if the
 * rule changes again later.
 *
 * Field limits mirror the `tickets` table column widths (`assignee`
 * VARCHAR(100), `department` VARCHAR(25), `subject` VARCHAR(100),
 * `description` VARCHAR(200), `code_ansible` VARCHAR(500)).
 */
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  codeAnsible: string;
}
