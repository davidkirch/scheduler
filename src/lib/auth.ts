import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { and, eq, exists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { projects, votes } from "@/db/schema";
import { env } from "@/env";

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	// ponytail: in-memory store, so counters reset on restart and don't span replicas.
	// Fine for a self-hosted single instance; move to the database store if you scale out.
	rateLimit: { enabled: true, window: 60, max: 20 },
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: { enabled: true },
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	socialProviders: {
		...(env.GITHUB_CLIENT_ID &&
			env.GITHUB_CLIENT_SECRET && {
				github: {
					clientId: env.GITHUB_CLIENT_ID,
					clientSecret: env.GITHUB_CLIENT_SECRET,
				},
			}),
	},
	plugins: [
		anonymous({
			onLinkAccount: async ({ anonymousUser, newUser }) => {
				const from = anonymousUser.user.id;
				const to = newUser.user.id;

				await db.transaction(async (tx) => {
					await tx
						.update(projects)
						.set({ ownerId: to })
						.where(eq(projects.ownerId, from));

					// votes has unique(project_id, voter_id): if both identities voted on the
					// same project, the reassign collides. Drop the anon vote, keep the real one.
					// The subquery MUST be correlated against the outer row — an uncorrelated
					// EXISTS is true whenever the table has any row at all, which would delete
					// every anonymous vote rather than only the colliding ones.
					const kept = alias(votes, "kept");
					await tx.delete(votes).where(
						and(
							eq(votes.voterId, from),
							exists(
								tx
									.select({ one: sql`1` })
									.from(kept)
									.where(
										and(
											eq(kept.projectId, votes.projectId),
											eq(kept.voterId, to),
										),
									),
							),
						),
					);

					await tx
						.update(votes)
						.set({ voterId: to, voterName: newUser.user.name })
						.where(eq(votes.voterId, from));
				});
			},
		}),
	],
});
