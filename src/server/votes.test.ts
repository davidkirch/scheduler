import { expect, test } from "vitest";
import { tallyVotes } from "@/server/votes";
import type { Vote } from "@/types";

function vote(overrides: Partial<Vote>): Vote {
	return {
		id: 1,
		projectId: 1,
		voterId: "user-1",
		voterName: "Ada",
		slots: [],
		...overrides,
	};
}

test("tallies voter names by normalized ISO slot", () => {
	const slot = new Date("2026-08-01T09:00:00.000Z");
	const tally = tallyVotes([
		vote({ id: 1, voterName: "Ada", slots: [slot] }),
		vote({ id: 2, voterName: "Grace", slots: [new Date(slot.toISOString())] }),
	]);

	expect(tally.get(slot.toISOString())).toEqual(["Ada", "Grace"]);
});

test("keeps separate slots separate", () => {
	const first = new Date("2026-08-01T09:00:00.000Z");
	const second = new Date("2026-08-01T10:00:00.000Z");
	const tally = tallyVotes([
		vote({ voterName: "Ada", slots: [first, second] }),
		vote({ id: 2, voterName: "Grace", slots: [second] }),
	]);

	expect(tally.get(first.toISOString())).toEqual(["Ada"]);
	expect(tally.get(second.toISOString())).toEqual(["Ada", "Grace"]);
});

test("normalizes serialized slot strings defensively", () => {
	const slot = "2026-08-01T09:00:00.000Z";
	const tally = tallyVotes([
		vote({ slots: [slot as unknown as Date], voterName: "Ada" }),
	]);

	expect(tally.get(slot)).toEqual(["Ada"]);
});
