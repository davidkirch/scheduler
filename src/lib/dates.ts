const MS_PER_DAY = 86_400_000;

// Group selected dates into runs of consecutive calendar days. Each run becomes one
// schedule-selector block (startDate + numDays), so gaps in the picked dates render as
// separate blocks rather than a stretch of empty columns. Round() absorbs DST ±1h.
export function contiguousRuns(dates: Date[]): Date[][] {
	if (dates.length === 0) return [];
	const sorted = dates
		.map((d) => new Date(d))
		.sort((a, b) => a.getTime() - b.getTime());

	const runs: Date[][] = [[sorted[0]]];
	for (let i = 1; i < sorted.length; i++) {
		const dayGap = Math.round(
			(sorted[i].getTime() - sorted[i - 1].getTime()) / MS_PER_DAY,
		);
		if (dayGap === 1) runs[runs.length - 1].push(sorted[i]);
		else runs.push([sorted[i]]);
	}
	return runs;
}
