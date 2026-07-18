import type { Vote } from "@/types";

// slot ISO string → names of everyone free at that slot. Keyed by ISO so the results
// grid can look up by cell time (`time.toISOString()`). new Date() guards against a
// slot arriving as a string rather than a Date over the wire.
export function tallyVotes(votes: Vote[]): Map<string, string[]> {
	const tally = new Map<string, string[]>();
	for (const v of votes)
		for (const slot of v.slots) {
			const iso = new Date(slot).toISOString();
			const names = tally.get(iso) ?? [];
			names.push(v.voterName);
			tally.set(iso, names);
		}
	return tally;
}
