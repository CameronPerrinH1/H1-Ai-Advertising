-- Row-level security for the intake wizard (09-intake-wizard.md §2: "isolation from
-- the first commit"). The wizard's queries run as intake_app, a role with no login
-- and no ownership, inside a transaction that sets intake.spa_id; these policies then
-- let it see and change only that spa's rows. Table owners and superusers bypass RLS,
-- which is why store.ts switches role rather than relying on ENABLE alone.
--
-- Links and sessions have no policies and no grants to intake_app: they're read by
-- token hash before the spa is known, through the store's system path only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'intake_app') THEN
    CREATE ROLE intake_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT intake_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO intake_app;
--> statement-breakpoint
GRANT SELECT ON intake_spas TO intake_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON intake_sections TO intake_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON intake_audit TO intake_app;
--> statement-breakpoint
ALTER TABLE intake_spas ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE intake_sections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE intake_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- An unset intake.spa_id matches nothing: NULLIF turns '' into NULL, and NULL = x is never true.
CREATE POLICY intake_spas_own ON intake_spas TO intake_app
  USING (id = NULLIF(current_setting('intake.spa_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY intake_sections_own ON intake_sections TO intake_app
  USING (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid)
  WITH CHECK (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY intake_audit_own ON intake_audit TO intake_app
  USING (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid)
  WITH CHECK (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid);
--> statement-breakpoint
-- The audit trail is append-only, the same way the platform's is (0001_append_only.sql).
-- Deleting a whole spa cascades into it only inside a purge (h1.purge = 'on').
CREATE OR REPLACE FUNCTION h1_reject_mutation() RETURNS trigger AS $$
BEGIN
  IF current_setting('h1.purge', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER intake_audit_append_only
  BEFORE UPDATE OR DELETE ON intake_audit
  FOR EACH ROW EXECUTE FUNCTION h1_reject_mutation();
