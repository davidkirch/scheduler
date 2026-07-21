import type { ISOTimeString } from "@astryxdesign/core";
import { Button } from "@astryxdesign/core/Button";
import { ContextMenu } from "@astryxdesign/core/ContextMenu";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenuItem } from "@astryxdesign/core/DropdownMenu";
import { Switch } from "@astryxdesign/core/Switch";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TimeInput } from "@astryxdesign/core/TimeInput";
import { useToast } from "@astryxdesign/core/Toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Trash2, Vote } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/components/calendar";
import { LabelWithTip } from "@/components/labelWithTip";
import LoginSignUp from "@/components/logInSignUp";
import UserBubble from "@/components/userBubble";
import type { projects } from "@/db/schema";
import { authClient } from "@/lib/auth-client";
import {
	createProjectInput,
	createProjectMutation,
	deleteProjectMutation,
	projectsQuery,
} from "@/server/projects";

type Project = typeof projects.$inferSelect; // a row you read back
const DEFAULT_MIN_TIME = "12:00" as ISOTimeString;
const DEFAULT_MAX_TIME = "20:00" as ISOTimeString;

export const Route = createFileRoute("/project/")({
	ssr: false,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(projectsQuery);
	},
	errorComponent: () => {
		const navigate = useNavigate();
		navigate({ to: "/" });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const showToast = useToast();

	const { data: session } = authClient.useSession();
	const { data: projects } = useSuspenseQuery(projectsQuery);

	const [projectName, setProjectName] = useState("");
	const [dates, setDates] = useState<Date[]>([]);
	const [hourlyChunks, setHourlyChunks] = useState("60");
	const [minTime, setMinTime] = useState<ISOTimeString>(DEFAULT_MIN_TIME);
	const [maxTime, setMaxTime] = useState<ISOTimeString>(DEFAULT_MAX_TIME);
	const [showResultsToGuests, setShowResultsToGuests] = useState(false);
	const [error, setError] = useState("");
	const [toDelete, setToDelete] = useState<Project | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	const deleteProject = useMutation({
		...deleteProjectMutation,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: projectsQuery.queryKey,
			});
		},
	});

	const createProject = useMutation({
		...createProjectMutation,
		onSuccess: (project) => {
			navigate({
				to: "/project/$projectSlug",
				params: { projectSlug: project.token },
			});
		},
	});

	async function confirmDelete() {
		if (!toDelete) return;
		setDeleting(true);
		setDeleteError("");
		try {
			// mutateAsync, not mutate — mutate returns void and never rejects, so the
			// catch below was unreachable and a failed delete looked like a success
			await deleteProject.mutateAsync(toDelete.token);
			setToDelete(null);
		} catch (e) {
			setDeleteError(
				e instanceof Error ? e.message : "could not delete project",
			);
		} finally {
			setDeleting(false);
		}
	}

	return session ? (
		<div className="bg-surface-page flex flex-col w-full min-h-dvh items-center align-center">
			<div className="relative flex flex-row w-full justify-center p-4">
				<div className="absolute left-8">
					<UserBubble />
				</div>
				<h1>scheduler</h1>
			</div>

			{/* Fluid gutter rather than a percentage width: a % gutter can't clamp, so it
			    kept its share while the form hit its min-width and overflowed to the right. */}
			<div className="w-full max-w-4xl px-(--pad-page) h-full">
				<form
					onSubmit={async (e) => {
						setError("");
						e.preventDefault();
						const result = createProjectInput.safeParse({
							name: projectName,
							minTime: Number(minTime.split(":")[0]), // "12:00" -> 12
							maxTime: Number(maxTime.split(":")[0]),
							hourlyChunks: 60 / Number(hourlyChunks), // minutes → slots per hour
							dates,
							showResultsToGuests,
						});
						if (!result.success) {
							setError(result.error.issues[0].message);
							return;
						}

						const data = result.data;

						createProject.mutate(data);
					}}
					className="flex flex-col gap-4"
				>
					<div className="w-full">
						<TextInput
							label="project name"
							value={projectName}
							onChange={setProjectName}
						/>
					</div>
					{/* Stacks at md. The row needs ~580px to honour min-w-70 plus the settings
					    column, so it changes shape well before either column is squeezed. */}
					<div className="flex flex-col md:flex-row gap-4">
						{/* mx-auto: max-w-100 caps the calendar below the column's width, so
						    without this it sits left-aligned against the slack. */}
						<div className="flex-1 mx-auto max-w-100 min-w-70 md:min-w-70">
							<LabelWithTip
								label="dates"
								tipContent="select all dates available for the poll."
							/>
							<Calendar
								mode="multiple"
								selected={dates}
								// day-picker hands back the whole new array; undefined means "none left"
								onSelect={(d) => setDates(d ?? [])}
								className="w-full"
							/>
						</div>
						{/* Needs `flex` as well as `flex-1`: the inner column only stretches to
						    this column's height as a flex item, and that height is what lets
						    `flex-1` on the fields block push the create button to the bottom. */}
						<div className="flex flex-1">
							<div className="flex flex-col gap-2 w-full">
								<div className="flex-1 flex flex-col gap-2">
									<div>
										<LabelWithTip
											label="pick start time"
											tipContent="defines the earliest time you can pick for each day."
										/>
										<TimeInput
											label="pick start time"
											isLabelHidden
											value={minTime}
											onChange={(value) =>
												setMinTime(value ?? DEFAULT_MIN_TIME)
											}
											increment={1}
											hourFormat="24h"
											width="100%"
										/>
									</div>

									<div>
										<LabelWithTip
											label="pick end time"
											tipContent="defines the latest time you can pick for each day."
										/>
										<TimeInput
											label="pick end time"
											isLabelHidden
											value={maxTime}
											onChange={(value) =>
												setMaxTime(value ?? DEFAULT_MAX_TIME)
											}
											increment={1}
											hourFormat="24h"
											width="100%"
										/>
									</div>

									<div>
										<LabelWithTip
											label="granularity"
											tipContent="defines the size of time slots. if you set it to 30 mins you can select two slots for each hour."
										/>
										<TabList
											value={hourlyChunks}
											onChange={setHourlyChunks}
											layout="fill"
											className="scheduler-granularity-tabs w-full"
										>
											<Tab value="60" label="1 hour" />
											<Tab value="30" label="30 minutes" />
											<Tab value="15" label="15 minutes" />
										</TabList>
									</div>
									<div>
										<LabelWithTip
											label="show results to guests"
											tipContent="if checked, guests can see results. if not only you are able to view results."
										/>
										<Switch
											label="show results to guests"
											isLabelHidden
											value={showResultsToGuests}
											onChange={setShowResultsToGuests}
										/>
									</div>
								</div>
								<div>
									<p className="text-red-600">{error}</p>
									<Button type="submit" label="create" variant="primary" />
								</div>
							</div>
						</div>
					</div>
				</form>
				<div className="flex flex-col pt-4">
					<h1>projects</h1>
					{projects.map((project) => (
						<ContextMenu
							key={project.token}
							menuContent={
								<>
									<DropdownMenuItem
										icon={<Vote />}
										label="Vote"
										onClick={() =>
											navigate({
												to: "/project/$projectSlug/vote",
												params: { projectSlug: project.token },
											})
										}
									/>
									<DropdownMenuItem
										icon={<Copy />}
										label="copy vote link"
										onClick={() => {
											navigator.clipboard.writeText(
												`${window.location.origin}/project/${project.token}/vote`,
											);
											showToast({ body: "copied votes link" });
										}}
									/>
									<Divider />
									<DropdownMenuItem
										className="text-destructive"
										icon={<Trash2 />}
										label="Delete"
										onClick={() => {
											setToDelete(project);
										}}
									/>
								</>
							}
						>
							<Link
								to="/project/$projectSlug"
								params={{ projectSlug: project.token }}
								preload="intent"
							>
								{project.name}
							</Link>
						</ContextMenu>
					))}
				</div>
			</div>

			<Dialog
				isOpen={toDelete !== null}
				onOpenChange={(open) => {
					if (open || deleting) return;
					setToDelete(null);
					setDeleteError("");
				}}
				purpose="form"
				width={400}
			>
				<div className="flex flex-col gap-4">
					<DialogHeader
						title={`delete "${toDelete?.name}"?`}
						subtitle="its votes and results go with it. this can't be undone."
					/>
					{deleteError && <p className="text-red-600">{deleteError}</p>}
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							label="cancel"
							variant="secondary"
							isDisabled={deleting}
							onClick={() => {
								setToDelete(null);
								setDeleteError("");
							}}
						/>
						<Button
							label={deleting ? "deleting..." : "delete"}
							variant="destructive"
							isDisabled={deleting}
							onClick={confirmDelete}
						/>
					</div>
				</div>
			</Dialog>
		</div>
	) : (
		<div className="flex flex-col items-center justify-center w-full min-h-dvh bg-surface-page">
			<LoginSignUp offerAnonymous offerSignIn />
		</div>
	);
}
