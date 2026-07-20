import { beforeAll, expect, test, vi } from "vitest";

// projects.ts reaches @/lib/auth -> @/env, which validates the real environment at
// import time. Give it something valid; nothing here opens a connection.
beforeAll(() => {
	vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/scheduler");
	vi.stubEnv("BETTER_AUTH_URL", "https://scheduler.example.com");
	vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
});

async function schema() {
	return (await import("./projects")).createProjectInput;
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
