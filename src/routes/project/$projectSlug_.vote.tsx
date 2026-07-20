import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoginSignUp from "@/components/logInSignUp";
import ScheduleGrid from "@/components/schedule-grid";
import { Button } from "@/components/ui/button";
import UserBubble from "@/components/userBubble";
import { authClient } from "@/lib/auth-client";
import {
	getMyVote,
	getProjectForVote,
	isAllowedToViewVotesForProject,
	submitVote,
} from "@/server/projects";

export const Route = createFileRoute("/project/$projectSlug_/vote")({
	ssr: false,
	loader: ({ params }) =>
		getProjectForVote({ data: { token: params.projectSlug } }),
	component: RouteComponent,
});

function RouteComponent() {
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user ?? null;
	const locked = isPending || !user;

	const project = Route.useLoaderData();

	const [schedule, setSchedule] = useState<Date[]>([]);
	const [showResultsButton, setShowResultsButton] = useState(false);

	// Prefill with this user's earlier vote once a session exists. A fresh guest has
	// nothing to load, so the grid just stays empty.
	useEffect(() => {
		if (!user) return;
		getMyVote({ data: { token: project.token } }).then((vote) => {
			if (vote?.slots) setSchedule(vote.slots.map((s) => new Date(s)));
		});
	}, [user, project.token]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		checkResultsAvailability();
	}, []);

	async function checkResultsAvailability() {
		setShowResultsButton(
			await isAllowedToViewVotesForProject({
				data: { token: project.token },
			}),
		);
	}

	return (
		<div className="flex flex-col items-center p-4 w-full gap-4 bg-surface-page">
			<h1>{project.name}</h1>
			{!locked && (
				<div className="absolute left-4">
					<UserBubble />
				</div>
			)}

			<div className="relative w-full">
				<div inert={locked} className={locked ? "opacity-50" : undefined}>
					<ScheduleGrid
						project={project}
						// Reserve the save button + the page's gap and bottom padding.
						bottomAllowance={104}
						selection={schedule}
						onChange={setSchedule}
					/>
					<div className="flex w-full items-center justify-center p-4 gap-4">
						<Button
							size="lg"
							onClick={async () => {
								await submitVote({
									data: { token: project.token, slots: schedule },
								});
								toast.success("vote has been saved", {
									position: "top-center",
								});
								checkResultsAvailability();
							}}
						>
							save
						</Button>
						<Link
							to="/project/$projectSlug"
							params={{ projectSlug: project.token }}
						>
							<Button
								className={showResultsButton !== true ? "hidden" : ""}
								size="lg"
							>
								see vote results
							</Button>
						</Link>
					</div>
				</div>
				{locked && !isPending && (
					<div className="absolute inset-0 grid place-items-center">
						<div className="w-sm rounded-lg bg-white p-4 shadow">
							<h2 className="pb-2">enter your name to pick your times</h2>
							<LoginSignUp offerAnonymous offerSignIn offerSignUp />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
