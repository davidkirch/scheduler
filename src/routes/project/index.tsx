import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleQuestionMark, Copy, Trash2, Vote } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import LoginSignUp from "@/components/logInSignUp";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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

export const Route = createFileRoute("/project/")({
	ssr: false,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(projectsQuery);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: session } = authClient.useSession();
	const { data: projects } = useSuspenseQuery(projectsQuery);

	const [dates, setDates] = useState<Date[]>([]);
	const [hourlyChunks, setHourlyChunks] = useState("60");
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
			await deleteProject.mutate(toDelete.token);
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
		<div className="bg-blue-200 flex flex-col w-full h-screen items-center align-center">
			<div className="relative flex flex-row w-full justify-center p-4">
				<div className="absolute left-4">
					<UserBubble />
				</div>
				<h1 className="pt-2">scheduler</h1>
			</div>

			<div className="w-6/10 h-full">
				<form
					onSubmit={async (e) => {
						setError("");
						e.preventDefault();
						const fd = new FormData(e.currentTarget);
						const result = createProjectInput.safeParse({
							name: fd.get("name"),
							minTime: Number(String(fd.get("minTime")).split(":")[0]), // "12:00" → 12
							maxTime: Number(String(fd.get("maxTime")).split(":")[0]),
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
						<p>project name</p>
						<Input name="name" />
					</div>
					<div className="flex flex-row gap-4 justify-between">
						<div>
							<LabelWithTip
								label="dates"
								tipContent="select all dates available for the poll."
							/>
							<Calendar
								mode="multiple"
								selected={dates}
								// day-picker hands back the whole new array; undefined means "none left"
								onSelect={(d) => setDates(d ?? [])}
								className="w-100"
							/>
						</div>
						<div className="flex flex-col justify-between w-full">
							<div className="flex flex-col gap-2">
								<div className="flex-1 ">
									<LabelWithTip
										label="pick start time"
										tipContent="defines the earliest time you can pick for each day."
									/>
									<Input
										type="time"
										name="minTime"
										step="60"
										defaultValue="12:00"
										className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
									/>
								</div>
								<div>
									<LabelWithTip
										label="pick end time"
										tipContent="defines the latest time you can pick for each day."
									/>
									<Input
										type="time"
										name="maxTime"
										step="60"
										defaultValue="20:00"
										className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
									/>
								</div>
								<LabelWithTip
									label="granularity"
									tipContent="defines the size of time slots. if you set it to 30 mins you can select two slots for each hour."
								/>
								<div>
									<Tabs
										defaultValue="60"
										value={hourlyChunks}
										onValueChange={setHourlyChunks}
									>
										<TabsList className="w-full">
											<TabsTrigger value="60">1 hour</TabsTrigger>
											<TabsTrigger value="30">30 minutes</TabsTrigger>
											<TabsTrigger value="15">15 minutes</TabsTrigger>
										</TabsList>
									</Tabs>
								</div>
								<div>
									<LabelWithTip
										label="show results to guests"
										tipContent="if checked, guests can see results. if not only you are able to view results."
									/>
									<Switch
										name="show-results-to-guests"
										checked={showResultsToGuests}
										onCheckedChange={setShowResultsToGuests}
									/>
								</div>
							</div>
							<div>
								<p className="text-red-600">{error}</p>
								<Button type="submit">create</Button>
							</div>
						</div>
					</div>
				</form>
				<div className="flex flex-col p-4">
					<h1>projects</h1>
					{projects.map((project) => (
						<ContextMenu key={project.token}>
							<ContextMenuTrigger>
								<Link
									to="/project/$projectSlug"
									params={{ projectSlug: project.token }}
									preload="intent"
								>
									{project.name}
								</Link>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuItem>
									<Link
										to="/project/$projectSlug/vote"
										params={{ projectSlug: project.token }}
										className="flex flex-row gap-1.5"
									>
										<Vote />
										Vote
									</Link>
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => {
										navigator.clipboard.writeText(
											`${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_BASE_URL}/project/${project.token}/vote`,
										);
										toast.success("copied votes link", {
											position: "top-center",
										});
									}}
								>
									<Copy />
									copy vote link
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									variant="destructive"
									onClick={() => {
										setToDelete(project);
									}}
								>
									<Trash2 />
									Delete
								</ContextMenuItem>
							</ContextMenuContent>
						</ContextMenu>
					))}
				</div>
			</div>

			<AlertDialog
				open={toDelete !== null}
				onOpenChange={(open) => {
					if (open || deleting) return;
					setToDelete(null);
					setDeleteError("");
				}}
			>
				<AlertDialogContent className="max-w-sm sm:max-w-sm">
					<AlertDialogHeader className="flex flex-col gap-2 w-full">
						<AlertDialogTitle>delete "{toDelete?.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							its votes and results go with it. this can't be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError && <p className="text-red-600">{deleteError}</p>}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deleting}
							onClick={confirmDelete}
						>
							{deleting ? "deleting…" : "delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	) : (
		<div className="flex flex-col items-center justify-center w-full h-screen oberflow-none bg-amber-300">
			<LoginSignUp offerAnonymous offerSignIn />
		</div>
	);
}

function LabelWithTip({
	label,
	tipContent,
	tipHeading,
}: {
	label: string;
	tipContent: string;
	tipHeading?: string;
}) {
	return (
		<div className="flex flex-row gap-1 items-center">
			<p>{label}</p>
			<Tooltip>
				<TooltipTrigger render={<CircleQuestionMark className="h-4" />} />
				<TooltipContent>
					<div className="flex flex-col">
						<p className="font-bold text-lg">{tipHeading}</p>
						<p>{tipContent}</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}
