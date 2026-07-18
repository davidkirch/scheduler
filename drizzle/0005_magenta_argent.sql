ALTER TABLE "projects" ADD COLUMN "token" varchar(32);--> statement-breakpoint
CREATE INDEX "token" ON "projects" USING btree ("token");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_token_unique" UNIQUE("token");