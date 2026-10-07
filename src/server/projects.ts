import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, or } from "drizzle-orm";
import z from "zod";
import { client, db } from "@/db";
import { projects, votes } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { Project } from "@/types";

const TOKEN_LENGTH = 32;
export const SUPPORTED_HOURLY_CHUNKS = [1, 2, 4] as const;
export const MAX_PROJECT_NAME_LENGTH = 128;
export const MAX_PROJECT_DATES = 64;
export const MAX_VOTE_SLOTS = MAX_PROJECT_DATES * 23 * 4;

const tokenInput = z.object({ token: z.string().length(TOKEN_LENGTH) });
const supportedHourlyChunks = new Set<number>(SUPPORTED_HOURLY_CHUNKS);

type CurrentUser = {
	id: string;
};

const minuteKey = (date: Date) =>
	Math.floor(new Date(date).getTime() / 60_000).toString();

function startOfLocalDay(date: Date) {
	// Project dates are calendar days in the app's local timezone. Vote slots are
	// accepted only if they match the local-day grid generated from those dates.
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day;
}

function slotAt(day: Date, minTime: number, hourlyChunks: number, row: number) {
	const slot = startOfLocalDay(day);
	const minutesInChunk = Math.floor(60 / hourlyChunks);
	slot.setHours(minTime + Math.floor(row / hourlyChunks));
	slot.setMinutes((row % hourlyChunks) * minutesInChunk);
	return slot;
}

function allowedVoteSlotKeys(project: Project) {
	const rows = (project.maxTime - project.minTime) * project.hourlyChunks;
	const keys = new Set<string>();

	for (const date of project.dates ?? []) {
		for (let row = 0; row < rows; row++) {
			keys.add(
				minuteKey(slotAt(date, project.minTime, project.hourlyChunks, row)),
			);
		}
	}

	return keys;
}

export function canViewProjectVotes(
	project: Pick<Project, "ownerId" | "showResultsToGuests">,
	user: CurrentUser | null,
) {
	if (!user) return false;
	return project.ownerId === user.id || project.showResultsToGuests;
}

export function ownsProject(
	project: Pick<Project, "ownerId">,
	user: CurrentUser | null,
) {
	return Boolean(user && project.ownerId === user.id);
}

export function validateVoteSlots(project: Project, slots: Date[]) {
	if (!supportedHourlyChunks.has(project.hourlyChunks)) {
		throw new Error("project uses an unsupported slot granularity");
	}

	const allowedSlots = allowedVoteSlotKeys(project);

	if (slots.length > allowedSlots.size) {
		throw new Error("vote contains more slots than this project allows");
	}

	const seen = new Set<string>();
	const normalized: Date[] = [];
	const minutesInChunk = Math.floor(60 / project.hourlyChunks);

	for (const rawSlot of slots) {
		const slot = new Date(rawSlot);
		if (slot.getSeconds() !== 0 || slot.getMilliseconds() !== 0) {
			throw new Error("vote contains a slot that is not aligned to the grid");
		}
		if (slot.getMinutes() % minutesInChunk !== 0) {
			throw new Error("vote contains a slot that is not aligned to the grid");
		}

		const key = minuteKey(slot);
		if (seen.has(key)) {
			throw new Error("vote contains duplicate slots");
		}
		if (!allowedSlots.has(key)) {
			throw new Error(
				"vote contains a slot outside this project's date/time range",
			);
		}

		seen.add(key);
		normalized.push(slot);
	}

	return normalized;
}

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
	.validator(tokenInput)
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
	.validator(tokenInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");
		if (!ownsProject(project, user)) throw new Error("project not found");
		const deleted = await db
			.delete(projects)
			.where(and(eq(projects.ownerId, user.id), eq(projects.token, data.token)))
			.returning({ token: projects.token });
		if (deleted.length === 0) throw new Error("project not found");
		return deleted[0];
	});

export const deleteProjectMutation = {
	mutationFn: (token: string) => deleteProject({ data: { token } }),
};

export const createProjectInput = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, { error: "project name is required" })
			.max(MAX_PROJECT_NAME_LENGTH, {
				error: `project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`,
			}),
		minTime: z
			.number()
			.int()
			.min(0, { error: "minimum time has to be zero or above" })
			.max(23, { error: "minimum time has to be 23 or below" })
			.default(8),
		maxTime: z
			.number()
			.int()
			.min(0, { error: "maximum time has to be zero or above" })
			.max(23, { error: "maximum time has to be 23 or below" })
			.default(22),
		hourlyChunks: z
			.number()
			.int()
			.default(1)
			.refine((val) => supportedHourlyChunks.has(val), {
				error: "granularity must be 60, 30, or 15 minutes",
			}),
		dates: z
			.array(z.coerce.date())
			.min(1, { error: "select at least one project date" })
			.max(MAX_PROJECT_DATES, {
				error: `select ${MAX_PROJECT_DATES} dates or fewer`,
			}),
		showResultsToGuests: z.boolean().default(false),
	})
	// Each bound is in range on its own but the pair still has to make sense —
	// minTime >= maxTime otherwise builds a grid with no rows in it.
	.refine((v) => v.minTime < v.maxTime, {
		error: "start time must be earlier than end time",
		path: ["minTime"],
	});
createProjectInput satisfies z.ZodType<
	Omit<typeof projects.$inferInsert, "id" | "ownerId" | "createdAt" | "token">
>;

export const createProject = createServerFn({ method: "POST" })
	.validator(createProjectInput)
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
	token: z.string().length(TOKEN_LENGTH),
	showResultsToGuests: z.boolean(),
});

export const updateVisibility = createServerFn({ method: "POST" })
	.validator(updateVisibilityInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		// Both predicates matter: the token picks the row, the owner check stops
		// someone flipping a project they merely hold a vote link for.
		const updated = await db
			.update(projects)
			.set({ showResultsToGuests: data.showResultsToGuests })
			.where(and(eq(projects.ownerId, user.id), eq(projects.token, data.token)))
			.returning({ token: projects.token });
		if (updated.length === 0) throw new Error("project not found");
		return updated[0];
	});

export const updateVisibilityMutation = {
	mutationFn: (data: z.infer<typeof updateVisibilityInput>) =>
		updateVisibility({ data }),
};

export const getVotesForProject = createServerFn({
	method: "GET",
})
	.validator(tokenInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");

		const allowed = canViewProjectVotes(project, user);
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
	.validator(tokenInput)
	.handler(async ({ data }) => {
		// A logged-out visitor on the public vote page is the normal case, not an
		// error — answer the question ("no") instead of throwing at them.
		const user = await currentUser();
		if (!user) return false;
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw new Error("project not found");

		return canViewProjectVotes(project, user);
	});

export const votesQuery = (token: string) =>
	queryOptions({
		queryKey: ["votes", token],
		queryFn: () => getVotesForProject({ data: { token } }),
	});

// No owner check — anyone with the link may open a project to vote on it.
export const getProjectForVote = createServerFn({ method: "GET" })
	.validator(tokenInput)
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
	.validator(tokenInput)
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

export const submitVoteInput = z.object({
	token: z.string().length(TOKEN_LENGTH),
	// Empty votes are valid: they explicitly say the voter is unavailable for
	// every proposed slot, and they still count as a response.
	slots: z.array(z.coerce.date()).max(MAX_VOTE_SLOTS, {
		error: `vote must contain ${MAX_VOTE_SLOTS} slots or fewer`,
	}),
});

export const submitVote = createServerFn({ method: "POST" })
	.validator(submitVoteInput)
	.handler(async ({ data }) => {
		const user = await currentUser();
		if (!user) throw new Error("log in first");
		const [project] = await db
			.select()
			.from(projects)
			.where(eq(projects.token, data.token))
			.limit(1);
		if (!project) throw Error("project not found");
		const slots = validateVoteSlots(project, data.slots);
		await db
			.insert(votes)
			.values({
				projectId: project.id,
				voterId: user.id,
				voterName: user.name,
				slots,
			})
			// one vote per (project, voter) — re-saving overwrites the previous pick
			.onConflictDoUpdate({
				target: [votes.projectId, votes.voterId],
				set: { slots, voterName: user.name },
			});
		client.notify("votes", data.token);
	});

async function currentUser() {
	const session = await auth.api.getSession({
		headers: getRequestHeaders(),
	});
	return session?.user ?? null; // null for a true guest — never undefined
}
