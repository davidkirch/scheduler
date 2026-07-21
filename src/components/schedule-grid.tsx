import { format, startOfDay } from "date-fns";
import {
	type CSSProperties,
	Fragment,
	type ReactElement,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { contiguousRuns } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

type SelectionMode = "add" | "remove";

type SlotMeta = {
	runIndex: number;
	dayIndex: number;
	rowIndex: number;
	time: Date;
};

type RunGrid = {
	dates: Date[];
	slots: Date[][];
};

type DragState = SlotMeta & {
	mode: SelectionMode;
};

const TIME_LABEL_WIDTH = 48;
const DEFAULT_CELL_HEIGHT = 25;
const MIN_CELL_HEIGHT = 10;
const DEFAULT_BOTTOM_ALLOWANCE = 72;
const DEFAULT_ROW_GAP = 4;

const minuteKey = (date: Date) =>
	Math.floor(new Date(date).getTime() / 60_000).toString();

function slotAt(day: Date, minTime: number, hourlyChunks: number, row: number) {
	const slot = startOfDay(new Date(day));
	const minutesInChunk = Math.floor(60 / hourlyChunks);
	slot.setHours(minTime + Math.floor(row / hourlyChunks));
	slot.setMinutes((row % hourlyChunks) * minutesInChunk);
	slot.setSeconds(0, 0);
	return slot;
}

function buildRuns(project: Project): RunGrid[] {
	const rows = (project.maxTime - project.minTime) * project.hourlyChunks;
	return contiguousRuns(project.dates ?? []).map((dates) => ({
		dates,
		slots: dates.map((day) =>
			Array.from({ length: rows }, (_, row) =>
				slotAt(day, project.minTime, project.hourlyChunks, row),
			),
		),
	}));
}

function rangeSelection(drag: DragState, target: SlotMeta, runs: RunGrid[]) {
	if (drag.runIndex !== target.runIndex) return null;

	const slots = runs[drag.runIndex]?.slots;
	if (!slots) return null;

	const dayStart = Math.min(drag.dayIndex, target.dayIndex);
	const dayEnd = Math.max(drag.dayIndex, target.dayIndex);
	const rowStart = Math.min(drag.rowIndex, target.rowIndex);
	const rowEnd = Math.max(drag.rowIndex, target.rowIndex);
	const selected: Date[] = [];

	for (let day = dayStart; day <= dayEnd; day++) {
		for (let row = rowStart; row <= rowEnd; row++) {
			const slot = slots[day]?.[row];
			if (slot) selected.push(slot);
		}
	}

	return selected;
}

function applySelection(
	baseSelection: Date[],
	range: Date[],
	mode: SelectionMode,
) {
	const rangeKeys = new Set(range.map(minuteKey));
	if (mode === "remove") {
		return baseSelection.filter((slot) => !rangeKeys.has(minuteKey(slot)));
	}

	const next = new Map(baseSelection.map((slot) => [minuteKey(slot), slot]));
	for (const slot of range) next.set(minuteKey(slot), slot);
	return Array.from(next.values());
}

export default function ScheduleGrid({
	project,
	selection = [],
	onChange,
	renderDateCell,
	className,
	bottomAllowance = DEFAULT_BOTTOM_ALLOWANCE,
}: {
	project: Project;
	selection?: Date[];
	onChange?: (selection: Date[]) => void;
	renderDateCell?: (time: Date) => ReactElement;
	className?: string;
	/** Px to reserve below the grid for whatever the page renders under it. */
	bottomAllowance?: number;
}) {
	const runs = useMemo(() => buildRuns(project), [project]);
	const rows = (project.maxTime - project.minTime) * project.hourlyChunks;
	const gridRef = useRef<HTMLDivElement>(null);
	const [cellHeight, setCellHeight] = useState(DEFAULT_CELL_HEIGHT);
	const [rowGap, setRowGap] = useState(DEFAULT_ROW_GAP);
	const [draftSelection, setDraftSelection] = useState<Date[] | null>(null);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const selectionRef = useRef(selection);
	const draftRef = useRef(draftSelection);
	const dragRef = useRef(dragState);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		selectionRef.current = selection;
	}, [selection]);

	useEffect(() => {
		draftRef.current = draftSelection;
	}, [draftSelection]);

	useEffect(() => {
		dragRef.current = dragState;
	}, [dragState]);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const slotsByKey = useMemo(() => {
		const slots = new Map<string, SlotMeta>();
		for (let runIndex = 0; runIndex < runs.length; runIndex++) {
			for (
				let dayIndex = 0;
				dayIndex < runs[runIndex].slots.length;
				dayIndex++
			) {
				for (
					let rowIndex = 0;
					rowIndex < runs[runIndex].slots[dayIndex].length;
					rowIndex++
				) {
					const time = runs[runIndex].slots[dayIndex][rowIndex];
					slots.set(minuteKey(time), { runIndex, dayIndex, rowIndex, time });
				}
			}
		}
		return slots;
	}, [runs]);

	const selectedKeys = useMemo(
		() => new Set((draftSelection ?? selection).map(minuteKey)),
		[draftSelection, selection],
	);

	useLayoutEffect(() => {
		if (rows <= 0) return;
		const fitCells = () => {
			const el = gridRef.current;
			if (!el) return;
			const available =
				window.innerHeight - el.getBoundingClientRect().top - bottomAllowance;
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
	}, [rows, bottomAllowance]);

	const updateDraft = useCallback(
		(target: SlotMeta) => {
			const drag = dragRef.current;
			if (!drag) return;
			const range = rangeSelection(drag, target, runs);
			if (!range) return;
			setDraftSelection(applySelection(selectionRef.current, range, drag.mode));
		},
		[runs],
	);

	const finishSelection = useCallback(() => {
		if (!dragRef.current) return;
		onChangeRef.current?.(draftRef.current ?? selectionRef.current);
		dragRef.current = null;
		draftRef.current = null;
		setDragState(null);
		setDraftSelection(null);
	}, []);

	useEffect(() => {
		if (!dragState) return;
		window.addEventListener("pointerup", finishSelection);
		window.addEventListener("pointercancel", finishSelection);
		return () => {
			window.removeEventListener("pointerup", finishSelection);
			window.removeEventListener("pointercancel", finishSelection);
		};
	}, [dragState, finishSelection]);

	const startSelection = (event: React.PointerEvent, meta: SlotMeta) => {
		if (!onChange) return;
		if (event.pointerType === "mouse" && event.button !== 0) return;
		event.preventDefault();

		const mode: SelectionMode = selectedKeys.has(minuteKey(meta.time))
			? "remove"
			: "add";
		const nextDrag = { ...meta, mode };
		dragRef.current = nextDrag;
		setDragState(nextDrag);
		const nextDraft = applySelection(selectionRef.current, [meta.time], mode);
		draftRef.current = nextDraft;
		setDraftSelection(nextDraft);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragRef.current) return;
		const root = gridRef.current;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		const cell = target?.closest<HTMLElement>("[data-slot-key]");
		if (!root || !cell || !root.contains(cell)) return;
		const slotKey = cell.dataset.slotKey;
		const meta = slotKey ? slotsByKey.get(slotKey) : undefined;
		if (meta) updateDraft(meta);
	};

	const toggleSlot = (time: Date) => {
		if (!onChange) return;
		const mode = selectedKeys.has(minuteKey(time)) ? "remove" : "add";
		onChange(applySelection(selection, [time], mode));
	};

	if (rows <= 0 || runs.length === 0) return null;

	return (
		<div
			ref={gridRef}
			className={cn("schedule-grid flex w-full items-start gap-2", className)}
			style={{ "--cell-h": `${cellHeight}px` } as CSSProperties}
			onPointerMove={handlePointerMove}
		>
			{runs.map((run, runIndex) => (
				<div
					key={run.dates[0].toISOString()}
					style={{
						flex: `${run.dates.length} 1 ${runIndex === 0 ? TIME_LABEL_WIDTH : 0}px`,
					}}
				>
					<div
						className="grid gap-x-1"
						style={{
							gridTemplateColumns:
								runIndex === 0
									? `${TIME_LABEL_WIDTH}px repeat(${run.dates.length}, minmax(0, 1fr))`
									: `repeat(${run.dates.length}, minmax(0, 1fr))`,
							rowGap,
						}}
					>
						{runIndex === 0 && <div />}
						{run.dates.map((date) => (
							<div
								key={date.toISOString()}
								className="h-6 overflow-hidden text-center text-xs leading-none"
							>
								{format(date, "EEE d.M")}
							</div>
						))}

						{Array.from({ length: rows }, (_, rowIndex) => {
							const labelTime = run.slots[0][rowIndex];
							return (
								<Fragment key={`row-${minuteKey(labelTime)}`}>
									{runIndex === 0 && (
										<div
											className="overflow-hidden pr-2 text-right text-xs leading-none"
											style={{
												width: TIME_LABEL_WIDTH,
												height: "var(--cell-h)",
											}}
										>
											{cellHeight >= 14 || labelTime.getMinutes() === 0
												? format(labelTime, "HH:mm")
												: ""}
										</div>
									)}
									{run.slots.map((daySlots, dayIndex) => {
										const time = daySlots[rowIndex];
										const key = minuteKey(time);
										const selected = selectedKeys.has(key);
										const meta = {
											runIndex,
											dayIndex,
											rowIndex,
											time,
										};
										if (renderDateCell) {
											return (
												<div
													key={time.toISOString()}
													className="min-w-0"
													style={{ height: "var(--cell-h)" }}
												>
													{renderDateCell(time)}
												</div>
											);
										}
										return (
											<button
												key={time.toISOString()}
												type="button"
												data-slot-key={key}
												aria-pressed={selected}
												aria-label={`${format(time, "EEE d MMM HH:mm")} ${selected ? "selected" : "not selected"}`}
												className={cn(
													"min-w-0 rounded-xs border border-black/10 touch-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
													selected
														? "bg-slot-free hover:brightness-95"
														: "bg-slot-busy hover:brightness-105",
												)}
												style={{ height: "var(--cell-h)" }}
												onPointerDown={(event) => startSelection(event, meta)}
												onPointerUp={finishSelection}
												onKeyDown={(event) => {
													if (event.key !== " " && event.key !== "Enter") {
														return;
													}
													event.preventDefault();
													toggleSlot(time);
												}}
											/>
										);
									})}
								</Fragment>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
