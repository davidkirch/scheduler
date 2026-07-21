import { beforeAll, expect, test, vi } from "vitest";
import type { Project } from "@/types";

// projects.ts reaches @/lib/auth -> @/env, which validates the real environment at
// import time. Give it something valid; nothing here opens a connection.
beforeAll(() => {
	vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/scheduler");
	vi.stubEnv("BETTER_AUTH_URL", "https://scheduler.example.com");
	vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
});

async function projectsModule() {
	return await import("./projects");
}

async function schema() {
	return (await projectsModule()).createProjectInput;
}

const base = {
	name: "standup",
	dates: [new Date("2026-08-01T00:00:00Z")],
	hourlyChunks: 1,
};

test("accepts a window where the start is before the end", async () => {
	const result = (await schema()).safeParse({
		...base,
		minTime: 9,
		maxTime: 17,
	});
	expect(result.success).toBe(true);
});

test("rejects a window where the start is after the end", async () => {
	const result = (await schema()).safeParse({
		...base,
		minTime: 18,
		maxTime: 9,
	});
	expect(result.success).toBe(false);
});

// The bound that actually bit: both values pass the 0-23 range check on their own,
// so only the cross-field rule catches it. An equal pair builds an empty grid.
test("rejects a window with no hours in it", async () => {
	const result = (await schema()).safeParse({
		...base,
		minTime: 12,
		maxTime: 12,
	});
	expect(result.success).toBe(false);
});

test("still rejects an out-of-range hour", async () => {
	const result = (await schema()).safeParse({
		...base,
		minTime: 0,
		maxTime: 24,
	});
	expect(result.success).toBe(false);
});

test("rejects unsupported schedule granularity", async () => {
	const result = (await schema()).safeParse({
		...base,
		minTime: 9,
		maxTime: 17,
		hourlyChunks: 3,
	});
	expect(result.success).toBe(false);
});

test("accepts the three UI-supported schedule granularities", async () => {
	const createProjectInput = await schema();
	for (const hourlyChunks of [1, 2, 4]) {
		const result = createProjectInput.safeParse({
			...base,
			minTime: 9,
			maxTime: 17,
			hourlyChunks,
		});
		expect(result.success).toBe(true);
	}
});

test("rejects too many project dates", async () => {
	const { MAX_PROJECT_DATES } = await projectsModule();
	const result = (await schema()).safeParse({
		...base,
		minTime: 9,
		maxTime: 17,
		dates: Array.from(
			{ length: MAX_PROJECT_DATES + 1 },
			(_, i) => new Date(2026, 7, i + 1),
		),
	});
	expect(result.success).toBe(false);
});

test("returns a user-friendly project name length error", async () => {
	const { MAX_PROJECT_NAME_LENGTH } = await projectsModule();
	const result = (await schema()).safeParse({
		...base,
		name: "x".repeat(MAX_PROJECT_NAME_LENGTH + 1),
		minTime: 9,
		maxTime: 17,
	});
	expect(result.success).toBe(false);
	expect(result.error?.issues[0]?.message).toMatch(/characters or fewer/);
});

function project(overrides: Partial<Project> = {}): Project {
	return {
		id: 1,
		token: "t".repeat(32),
		name: "standup",
		ownerId: "owner",
		minTime: 9,
		maxTime: 11,
		hourlyChunks: 2,
		dates: [new Date(2026, 7, 1)],
		showResultsToGuests: false,
		createdAt: new Date(2026, 6, 1),
		...overrides,
	};
}

test("accepts valid vote slots and keeps empty votes valid", async () => {
	const { validateVoteSlots } = await projectsModule();
	const p = project();

	expect(validateVoteSlots(p, [])).toEqual([]);
	expect(
		validateVoteSlots(p, [
			new Date(2026, 7, 1, 9),
			new Date(2026, 7, 1, 10, 30),
		]),
	).toHaveLength(2);
});

test("rejects vote slots outside the project dates", async () => {
	const { validateVoteSlots } = await projectsModule();

	expect(() => validateVoteSlots(project(), [new Date(2026, 7, 2, 9)])).toThrow(
		/outside/,
	);
});

test("rejects vote slots outside the project time window", async () => {
	const { validateVoteSlots } = await projectsModule();

	expect(() =>
		validateVoteSlots(project(), [new Date(2026, 7, 1, 11)]),
	).toThrow(/outside/);
});

test("rejects vote slots that do not align to the project granularity", async () => {
	const { validateVoteSlots } = await projectsModule();

	expect(() =>
		validateVoteSlots(project(), [new Date(2026, 7, 1, 9, 15)]),
	).toThrow(/aligned/);
});

test("rejects duplicate vote slots", async () => {
	const { validateVoteSlots } = await projectsModule();
	const slot = new Date(2026, 7, 1, 9);

	expect(() => validateVoteSlots(project(), [slot, slot])).toThrow(/duplicate/);
});

test("rejects more vote slots than the project grid can contain", async () => {
	const { validateVoteSlots } = await projectsModule();
	const p = project({
		minTime: 9,
		maxTime: 10,
		hourlyChunks: 1,
		dates: [new Date(2026, 7, 1)],
	});

	expect(() =>
		validateVoteSlots(p, [
			new Date(2026, 7, 1, 9),
			new Date(2026, 7, 1, 9, 30),
		]),
	).toThrow(/more slots/);
});

test("rejects vote slots with second or millisecond precision", async () => {
	const { validateVoteSlots } = await projectsModule();

	expect(() =>
		validateVoteSlots(project(), [new Date(2026, 7, 1, 9, 0, 1)]),
	).toThrow(/aligned/);
	expect(() =>
		validateVoteSlots(project(), [new Date(2026, 7, 1, 9, 0, 0, 1)]),
	).toThrow(/aligned/);
});

test("rejects projects with unsupported stored granularity before validating slots", async () => {
	const { validateVoteSlots } = await projectsModule();

	expect(() =>
		validateVoteSlots(project({ hourlyChunks: 3 }), [new Date(2026, 7, 1, 9)]),
	).toThrow(/unsupported/);
});

test("bounds submitted vote payload size before project lookup", async () => {
	const { MAX_VOTE_SLOTS, submitVoteInput } = await projectsModule();
	const result = submitVoteInput.safeParse({
		token: "t".repeat(32),
		slots: Array.from(
			{ length: MAX_VOTE_SLOTS + 1 },
			() => new Date(2026, 7, 1, 9),
		),
	});

	expect(result.success).toBe(false);
});

test("enforces private and public result visibility", async () => {
	const { canViewProjectVotes } = await projectsModule();
	const privateProject = project();

	expect(canViewProjectVotes(privateProject, null)).toBe(false);
	expect(canViewProjectVotes(privateProject, { id: "someone-else" })).toBe(
		false,
	);
	expect(canViewProjectVotes(privateProject, { id: "owner" })).toBe(true);
	expect(
		canViewProjectVotes(project({ showResultsToGuests: true }), {
			id: "someone-else",
		}),
	).toBe(true);
});

test("checks project ownership for mutating operations", async () => {
	const { ownsProject } = await projectsModule();
	const p = project();

	expect(ownsProject(p, null)).toBe(false);
	expect(ownsProject(p, { id: "someone-else" })).toBe(false);
	expect(ownsProject(p, { id: "owner" })).toBe(true);
});
