CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"voter_name" text NOT NULL,
	"slots" timestamp with time zone[] NOT NULL,
	CONSTRAINT "one_vote_per_person" UNIQUE("project_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "minTime" smallint DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "maxTime" smallint DEFAULT 22 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "hourlyChunks" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "dates" timestamp with time zone[];--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "showResultsToGuests" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "votes_project_idx" ON "votes" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id");