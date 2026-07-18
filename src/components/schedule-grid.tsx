import { format } from "date-fns";
import {
	type CSSProperties,
	type ReactElement,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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

// The library hardcodes `height: 25px` on its date cell. `.rgdp__grid-cell` is a literal
// class it sets (not a styled-components hash), so it's a stable hook — and styling the
// child covers both the library's own cell and a custom renderDateCell. The override
// lives in styles.css, not a Tailwind class; see the comment there for why.
const DEFAULT_CELL_HEIGHT = 25;
// ponytail: 10px floor — below this, drag-selection accuracy on touch falls apart.
// If a project still overflows at the floor, it scrolls; paginate by day if that bites.
const MIN_CELL_HEIGHT = 10;
// Date labels + the container's own bottom padding sit inside the measured box.
const CHROME_ALLOWANCE = 72;
// The library's own rowGap default. It's a fixed px value, so left alone it stays 4px
// while cells shrink — at a 10px cell that reads as tiny cells floating far apart, and
// it silently blows the fit budget since every row costs cellHeight + gap.
const DEFAULT_ROW_GAP = 4;

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

	// Shrink cells so the whole day fits the viewport, down to the touch floor.
	const rows = (project.maxTime - project.minTime) * project.hourlyChunks;
	const gridRef = useRef<HTMLDivElement>(null);
	const [cellHeight, setCellHeight] = useState(DEFAULT_CELL_HEIGHT);
	const [rowGap, setRowGap] = useState(DEFAULT_ROW_GAP);

	useLayoutEffect(() => {
		if (rows <= 0) return;
		const fitCells = () => {
			const el = gridRef.current;
			if (!el) return;
			// The grid's top is set by the content above it and doesn't move when cell
			// height changes, so measuring here can't feed back into itself.
			const available =
				window.innerHeight - el.getBoundingClientRect().top - CHROME_ALLOWANCE;
			// A row costs cellHeight + gap, and the gap tracks the cell so it stays a
			// seam rather than dominating. Size the gap off a first pass, then solve for
			// the cell height that actually fits with that gap included.
			const rough = Math.floor(available / rows);
			const gap = Math.max(
				0,
				Math.min(DEFAULT_ROW_GAP, Math.round(rough * 0.16)),
			);
			const next = Math.floor((available - rows * gap) / rows);
			setRowGap(gap);
			setCellHeight(
				Math.max(MIN_CELL_HEIGHT, Math.min(DEFAULT_CELL_HEIGHT, next)),
			);
		};
		fitCells();
		window.addEventListener("resize", fitCells);
		return () => window.removeEventListener("resize", fitCells);
	}, [rows]);

	return (
		<StyleSheetManager shouldForwardProp={(prop) => !styleOnlyProps.has(prop)}>
			<div
				ref={gridRef}
				// --rows feeds the grid-template-rows override in styles.css; every run has
				// the same row count, so one value covers them all.
				style={
					{ "--cell-h": `${cellHeight}px`, "--rows": rows } as CSSProperties
				}
				className={`schedule-grid flex w-full items-start gap-2 ${className ?? ""}`}
			>
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
							rowGap={`${rowGap}px`}
							dateFormat="dd D.M"
							unselectedColor="#FFA2A2"
							selectedColor="#07E072"
							renderTimeLabel={
								i === 0
									? (time) => (
											// Height-capped so the label can't out-grow a shrunken cell and
											// force the row back open. Once cells are too short to hold text,
											// only whole hours are labelled.
											<div
												className="overflow-hidden pr-2 text-right text-xs leading-none"
												style={{
													width: TIME_LABEL_WIDTH,
													height: `var(--cell-h)`,
												}}
											>
												{cellHeight >= 14 || time.getMinutes() === 0
													? format(time, "HH:mm")
													: ""}
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
