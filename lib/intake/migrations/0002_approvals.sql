CREATE TABLE "intake_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spa_id" uuid NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"credential" text NOT NULL,
	"token_hash" text NOT NULL,
	"content_hash" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text,
	"note" text,
	"decided_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "intake_approvals_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "intake_approvals" ADD CONSTRAINT "intake_approvals_spa_id_intake_spas_id_fk" FOREIGN KEY ("spa_id") REFERENCES "public"."intake_spas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_approvals_spa_id_idx" ON "intake_approvals" USING btree ("spa_id");--> statement-breakpoint
-- The spa's link can see its own approvals' status and send new ones (which
-- supersedes the open ones); decisions are recorded only through the approver's
-- own link, by the store's system path. Same rules as 0001_rls.sql.
GRANT SELECT, INSERT, UPDATE ON intake_approvals TO intake_app;
--> statement-breakpoint
ALTER TABLE intake_approvals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY intake_approvals_own ON intake_approvals TO intake_app
  USING (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid)
  WITH CHECK (spa_id = NULLIF(current_setting('intake.spa_id', true), '')::uuid);
