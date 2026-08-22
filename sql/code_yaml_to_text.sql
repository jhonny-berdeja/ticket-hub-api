-- Widens `code_yaml` on `kubernetes_tickets` from VARCHAR(5000) to
-- unbounded TEXT.
--
-- Manual DDL — this repo has `synchronize: false` and no automated
-- migrations (see `src/common/database/database.module.ts`), so this file
-- is a reference to run by hand against the real database, not something
-- any tool applies automatically.
--
-- The 5000-char cap was rejecting real manifests/playbooks pasted by
-- requesters; TEXT removes the limit instead of raising it to another
-- arbitrary fixed number.
ALTER TABLE kubernetes_tickets
  ALTER COLUMN code_yaml TYPE TEXT;
