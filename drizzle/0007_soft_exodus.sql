ALTER TABLE "projects" ALTER COLUMN "token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_token_unique" UNIQUE("token");