import { expect, test } from "vitest";
import { planAnonymousVoteLink } from "@/lib/anonymous-linking";

test("moves anonymous votes when the linked account has not voted on that project", () => {
	const plan = planAnonymousVoteLink(
		[
			{ id: 1, projectId: 10, voterId: "anonymous" },
			{ id: 2, projectId: 20, voterId: "real" },
		],
		"anonymous",
		"real",
	);

	expect(plan).toEqual({ deleteVoteIds: [], updateVoteIds: [1] });
});

test("deletes anonymous votes that would collide with an existing real-user vote", () => {
	const plan = planAnonymousVoteLink(
		[
			{ id: 1, projectId: 10, voterId: "anonymous" },
			{ id: 2, projectId: 10, voterId: "real" },
			{ id: 3, projectId: 20, voterId: "anonymous" },
		],
		"anonymous",
		"real",
	);

	expect(plan).toEqual({ deleteVoteIds: [1], updateVoteIds: [3] });
});

test("ignores votes from unrelated users", () => {
	const plan = planAnonymousVoteLink(
		[
			{ id: 1, projectId: 10, voterId: "anonymous" },
			{ id: 2, projectId: 10, voterId: "someone-else" },
		],
		"anonymous",
		"real",
	);

	expect(plan).toEqual({ deleteVoteIds: [], updateVoteIds: [1] });
});
