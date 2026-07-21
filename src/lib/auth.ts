import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects, votes } from "@/db/schema";
import { env } from "@/env";
import { planAnonymousVoteLink } from "@/lib/anonymous-linking";

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

					const linkableVotes = await tx
						.select({
							id: votes.id,
							projectId: votes.projectId,
							voterId: votes.voterId,
						})
						.from(votes)
						.where(inArray(votes.voterId, [from, to]));
					const plan = planAnonymousVoteLink(linkableVotes, from, to);

					if (plan.deleteVoteIds.length > 0) {
						await tx.delete(votes).where(inArray(votes.id, plan.deleteVoteIds));
					}

					if (plan.updateVoteIds.length > 0) {
						await tx
							.update(votes)
							.set({ voterId: to, voterName: newUser.user.name })
							.where(inArray(votes.id, plan.updateVoteIds));
					}
				});
			},
		}),
	],
});
