import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, or } from "drizzle-orm";
import z from "zod";
import { client, db } from "@/db";
import { projects, usersTable, votes } from "@/db/schema";
import { auth } from "@/lib/auth";

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
	return await db.select().from(usersTable);
});

export const usersQuery = queryOptions({
	queryKey: ["users"],
	queryFn: () => getUser(),
});

export const listProjects = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await currentUser();
		if (!user) throw Error("log in first");
		return await db
			.select()
			.from(projects)
			.where(eq(projects.ownerId, user.id));
	},
);

export const getProject = createServerFn({ method: "GET" })
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(
				and(
					or(
						eq(projects.ownerId, user.id),
						eq(projects.showResultsToGuests, true),
					),
					eq(projects.token, data.token),
				),
			);
		if (!project) throw new Error("project not found");
		return project;
	});

export const getProjectQuery = (token: string) =>
	queryOptions({
		queryKey: ["project", token],
		queryFn: () => getProject({ data: { token } }),
	});

export const projectsQuery = queryOptions({
	queryKey: ["projects"],
	queryFn: () => listProjects(),
});

export const deleteProject = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");
		if (project.ownerId !== user.id)
			throw new Error("this project doesnt belong to you");
		return await db.delete(projects).where(eq(projects.token, data.token));
	});

export const deleteProjectMutation = {
	mutationFn: (token: string) => deleteProject({ data: { token } }),
};

export const createProjectInput = z.object({
	name: z.string().min(1).max(255),
	minTime: z.number().int().min(0).max(23).default(8),
	maxTime: z.number().int().min(0).max(23).default(22),
	hourlyChunks: z.number().int().positive().default(1),
	dates: z.array(z.coerce.date()).min(1),
	showResultsToGuests: z.boolean().default(false),
});
createProjectInput satisfies z.ZodType<
	Omit<typeof projects.$inferInsert, "id" | "ownerId" | "createdAt" | "token">
>;

export const createProject = createServerFn({ method: "POST" })
	.inputValidator(createProjectInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const token = crypto.randomUUID().slice(0, 32);
		const [project] = await db
			.insert(projects)
			.values({ ...data, ownerId: user.id, token })
			.returning({ token: projects.token });
		return project;
	});

export const createProjectMutation = {
	mutationFn: (data: z.infer<typeof createProjectInput>) =>
		createProject({ data }),
};

const updateVisibilityInput = z.object({
	token: z.string().length(32),
	showResultsToGuests: z.boolean(),
});

export const updateVisibility = createServerFn({ method: "POST" })
	.inputValidator(updateVisibilityInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		return await db
			.update(projects)
			.set({ showResultsToGuests: data.showResultsToGuests })
			.where(eq(projects.ownerId, user.id));
	});

export const updateVisibilityMutation = {
	mutationFn: (data: z.infer<typeof updateVisibilityInput>) =>
		updateVisibility({ data }),
};

export const getVotesForProject = createServerFn({
	method: "GET",
})
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");

		const allowed = project.ownerId === user.id || project.showResultsToGuests;
		if (!allowed) return { allowed: false as const, votes: [] };

		const projectVotes = await db
			.select()
			.from(votes)
			.where(eq(votes.projectId, project.id));
		return { allowed: true as const, votes: projectVotes };
	});

export const isAllowedToViewVotesForProject = createServerFn({
	method: "GET",
})
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");

		const allowed = project.ownerId === user.id || project.showResultsToGuests;
		return allowed;
	});

export const votesQuery = (token: string) =>
	queryOptions({
		queryKey: ["votes", token],
		queryFn: () => getVotesForProject({ data: { token } }),
	});

// No owner check — anyone with the link may open a project to vote on it.
export const getProjectForVote = createServerFn({ method: "GET" })
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");
		return project;
	});

export const getProjectForVoteQuery = (token: string) =>
	queryOptions({
		queryKey: ["project-vote", token],
		queryFn: () => getProjectForVote({ data: { token } }),
	});

export const getMyVote = createServerFn({ method: "GET" })
	.inputValidator(z.object({ token: z.string().length(32) }))
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) return null;
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw Error("project not found");
		const [vote] = await db
			.select()
			.from(votes)
			.where(and(eq(votes.projectId, project.id), eq(votes.voterId, user.id)))
			.limit(1);
		return vote ?? null;
	});

export const submitVote = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			token: z.string().length(32),
			slots: z.array(z.coerce.date()),
		}),
	)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw Error("project not found");
		await db
			.insert(votes)
			.values({
				projectId: project.id,
				voterId: user.id,
				voterName: user.name,
				slots: data.slots,
			})
			// one vote per (project, voter) — re-saving overwrites the previous pick
			.onConflictDoUpdate({
				target: [votes.projectId, votes.voterId],
				set: { slots: data.slots, voterName: user.name },
			});
		client.notify("votes", data.token);
	});

async function currentUser() {
	const session = await auth.api.getSession({
		headers: getRequestHeaders(),
	});
	return session?.user ?? null; // null for a true guest — never undefined
}
