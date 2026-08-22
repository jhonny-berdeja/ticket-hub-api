-- Widens `code_ansible` on `datacenter_tickets` from VARCHAR(5000) to
-- unbounded TEXT.
--
-- Manual DDL — this repo has `synchronize: false` and no automated
-- migrations (see `src/common/database/database.module.ts`), so this file
-- is a reference to run by hand against the real database, not something
-- any tool applies automatically.
--
-- Same 500-char cap issue as `code_yaml` on `kubernetes_tickets`
-- (see `code_yaml_to_text.sql`): the cap was rejecting real playbooks
-- pasted by requesters; TEXT removes the limit instead of raising it to
-- another arbitrary fixed number.
ALTER TABLE datacenter_tickets
  ALTER COLUMN code_ansible TYPE TEXT;
