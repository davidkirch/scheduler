ALTER TABLE "votes" DROP CONSTRAINT "votes_voter_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;