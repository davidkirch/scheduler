import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins";
import { and, eq, exists } from "drizzle-orm";
import { db } from "@/db";
import { projects, votes } from "@/db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	emailAndPassword: { enabled: true },
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
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
					await tx.delete(votes).where(
						and(
							eq(votes.voterId, from),
							exists(
								tx
									.select()
									.from(votes)
									.as("v"), // v.project_id = votes.project_id AND v.voter_id = to
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
