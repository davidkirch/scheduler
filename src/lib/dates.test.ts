import { expect, test } from "vitest";
import { contiguousRuns } from "@/lib/dates";

const isoDates = (runs: Date[][]) =>
	runs.map((run) => run.map((date) => date.toISOString().slice(0, 10)));

test("returns no runs for an empty date list", () => {
	expect(contiguousRuns([])).toEqual([]);
});

test("sorts dates and groups consecutive calendar days", () => {
	const runs = contiguousRuns([
		new Date("2026-08-05T00:00:00Z"),
		new Date("2026-08-01T00:00:00Z"),
		new Date("2026-08-02T00:00:00Z"),
		new Date("2026-08-04T00:00:00Z"),
	]);

	expect(isoDates(runs)).toEqual([
		["2026-08-01", "2026-08-02"],
		["2026-08-04", "2026-08-05"],
	]);
});

test("keeps duplicate dates in the same run instead of dropping data", () => {
	const runs = contiguousRuns([
		new Date("2026-08-01T00:00:00Z"),
		new Date("2026-08-01T12:00:00Z"),
		new Date("2026-08-02T00:00:00Z"),
	]);

	expect(isoDates(runs)).toEqual([["2026-08-01", "2026-08-01", "2026-08-02"]]);
});
