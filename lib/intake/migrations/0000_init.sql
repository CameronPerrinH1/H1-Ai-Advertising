CREATE TABLE "intake_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spa_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"section" text,
	"version" integer,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "intake_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"spa_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intake_sections" (
	"spa_id" uuid NOT NULL,
	"section" text NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intake_sections_spa_id_section_pk" PRIMARY KEY("spa_id","section")
);
--> statement-breakpoint
CREATE TABLE "intake_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"spa_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intake_spas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile" jsonb NOT NULL,
	"emails" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intake_audit" ADD CONSTRAINT "intake_audit_spa_id_intake_spas_id_fk" FOREIGN KEY ("spa_id") REFERENCES "public"."intake_spas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_links" ADD CONSTRAINT "intake_links_spa_id_intake_spas_id_fk" FOREIGN KEY ("spa_id") REFERENCES "public"."intake_spas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_sections" ADD CONSTRAINT "intake_sections_spa_id_intake_spas_id_fk" FOREIGN KEY ("spa_id") REFERENCES "public"."intake_spas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_sessions" ADD CONSTRAINT "intake_sessions_spa_id_intake_spas_id_fk" FOREIGN KEY ("spa_id") REFERENCES "public"."intake_spas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_audit_spa_at_idx" ON "intake_audit" USING btree ("spa_id","at");--> statement-breakpoint
CREATE INDEX "intake_links_spa_id_idx" ON "intake_links" USING btree ("spa_id");--> statement-breakpoint
CREATE INDEX "intake_sessions_spa_id_idx" ON "intake_sessions" USING btree ("spa_id");