import { format } from "date-fns";
import { type ReactElement, useMemo } from "react";
import ScheduleSelector from "react-schedule-selector";
import { StyleSheetManager } from "styled-components";
import { contiguousRuns } from "@/lib/dates";
import type { Project } from "@/types";

// ponytail: react-schedule-selector targets styled-components v5, which filtered
// non-DOM props automatically. v6 dropped that, so these style-only props leak to
// the DOM as attributes and React warns. They are used purely in CSS templates, so
// blocking them is safe. Add @emotion/is-prop-valid only if the list grows unwieldy.
const styleOnlyProps = new Set([
	"columns",
	"rows",
	"columnGap",
	"rowGap",
	"selected",
	"selectedColor",
	"unselectedColor",
	"hoveredColor",
]);

// A selector's grid is `auto repeat(numDays, 1fr)`, where the leading `auto` is the
// time-label column. Only the first run draws labels; the rest render an empty column
// that collapses to nothing, leaving the column gaps as a seam between runs.
const TIME_LABEL_WIDTH = 48;

const noop = () => {};

// Note: dateFormat below is parsed by the date-fns v1 the library bundles ("D" is the
// day of month there). format() here is the project's date-fns v4. Don't mix the tokens.
//
// Pass renderDateCell to draw your own cells — the results heatmap does, which is why
// selection/onChange are optional. A custom cell replaces the library's colouring and
// its hover state entirely, so `selected` isn't forwarded; ask your own state instead.
export default function ScheduleGrid({
	project,
	selection = [],
	onChange,
	renderDateCell,
	className,
}: {
	project: Project;
	selection?: Date[];
	onChange?: (selection: Date[]) => void;
	renderDateCell?: (time: Date) => ReactElement;
	className?: string;
}) {
	const runs = useMemo(
		() => contiguousRuns(project.dates ?? []),
		[project.dates],
	);

	return (
		<StyleSheetManager shouldForwardProp={(prop) => !styleOnlyProps.has(prop)}>
			<div className={`flex w-full items-start gap-2 ${className ?? ""}`}>
				{runs.map((run, i) => (
					<div
						key={run[0].toISOString()}
						// Grow by day count so a cell is the same width in every run. The first run's
						// basis offsets its label column, which would otherwise squeeze its cells.
						style={{
							flex: `${run.length} 1 ${i === 0 ? TIME_LABEL_WIDTH : 0}px`,
						}}
					>
						<ScheduleSelector
							// Each run gets the whole selection and hands the whole selection back: a
							// selector only adds or removes cells from its own date matrix, so the other
							// runs' picks pass through untouched. Nothing to merge.
							selection={selection}
							onChange={onChange ?? noop}
							renderDateCell={renderDateCell}
							startDate={run[0]}
							numDays={run.length}
							minTime={project.minTime}
							maxTime={project.maxTime}
							hourlyChunks={project.hourlyChunks}
							dateFormat="dd D.M"
							unselectedColor="#FFA2A2"
							selectedColor="#07E072"
							renderTimeLabel={
								i === 0
									? (time) => (
											<div
												className="pr-2 text-right text-xs"
												style={{ width: TIME_LABEL_WIDTH }}
											>
												{format(time, "HH:mm")}
											</div>
										)
									: () => <div />
							}
						/>
					</div>
				))}
			</div>
		</StyleSheetManager>
	);
}
