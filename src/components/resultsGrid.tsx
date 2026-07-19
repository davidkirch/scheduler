import { format } from "date-fns";
import { useMemo, useState } from "react";
import ScheduleGrid from "@/components/schedule-grid";
import { tallyVotes } from "@/server/votes";
import type { Project, Vote } from "@/types";

// Matches the green the vote grid uses for a picked slot. Mixed toward --slot-empty
// rather than transparent so an empty cell reads as empty on whatever the page is;
// that token follows the theme, so this stays correct in dark mode too.
const heat = (share: number) =>
	`color-mix(in oklab, var(--slot-free) ${Math.round(share * 100)}%, var(--slot-empty))`;

export default function ResultsGrid({
	project,
	votes,
}: {
	project: Project;
	votes: Vote[];
}) {
	const tally = useMemo(() => tallyVotes(votes), [votes]);
	const [hovered, setHovered] = useState<string | null>(null);

	if (votes.length === 0) {
		return (
			<p className="py-4">no votes yet — share the vote link to collect some</p>
		);
	}

	const free = hovered ? (tally.get(hovered) ?? []) : [];
	const busy = votes
		.map((v) => v.voterName)
		.filter((name) => !free.includes(name));

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center justify-between text-xs">
				<span>
					{votes.length} {votes.length === 1 ? "voter" : "voters"}
				</span>
				<span className="flex items-center gap-1">
					0
					{[0, 0.25, 0.5, 0.75, 1].map((share) => (
						<span
							key={share}
							className="size-3.5 rounded-xs border border-black/10"
							style={{ background: heat(share) }}
						/>
					))}
					{votes.length}
				</span>
			</div>

			<div className="flex w-full items-start gap-4">
				<ScheduleGrid
					project={project}
					// Nothing sits below the grid here — just the page's own bottom padding.
					bottomAllowance={32}
					// Hands touch-scrolling back to the page — see .results-grid in styles.css.
					className="results-grid"
					renderDateCell={(time) => {
						const iso = time.toISOString();
						const count = tally.get(iso)?.length ?? 0;
						return (
							<button
								type="button"
								aria-label={`${format(time, "EEE d MMM HH:mm")} — ${count} of ${votes.length} free`}
								className="size-full rounded-xs border border-black/10 cursor-default"
								style={{
									background: heat(count / votes.length),
									outline: hovered === iso ? "2px solid black" : undefined,
								}}
								onMouseEnter={() => setHovered(iso)}
								onFocus={() => setHovered(iso)}
							/>
						);
					}}
				/>

				<div className="w-44 shrink-0 text-sm">
					{hovered ? (
						<>
							<p className="font-bold">
								{format(new Date(hovered), "EEE d MMM HH:mm")}
							</p>
							<p className="pt-2 text-xs">
								free ({free.length}/{votes.length})
							</p>
							<p>{free.join(", ") || "nobody"}</p>
							<p className="pt-2 text-xs">busy</p>
							<p>{busy.join(", ") || "nobody"}</p>
						</>
					) : (
						<p className="text-xs">hover a slot to see who's free</p>
					)}
				</div>
			</div>
		</div>
	);
}
