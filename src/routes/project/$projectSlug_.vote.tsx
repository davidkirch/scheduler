import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoginSignUp from "@/components/logInSignUp";
import ScheduleGrid from "@/components/schedule-grid";
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
	errorComponent: () => (
		<div className="flex flex-col w-full min-h-dvh items-center justify-center p-8 gap-4 bg-surface-page">
			<h1>this link doesn't work</h1>
			<p className="text-center">
				the project may have been deleted, or the link was copied incorrectly.
				ask whoever shared it for a fresh one.
			</p>
		</div>
	),
	component: RouteComponent,
});

function RouteComponent() {
	const { data: session, isPending } = authClient.useSession();
	const user = session?.user ?? null;
	const locked = isPending || !user;

	const project = Route.useLoaderData();

	const [schedule, setSchedule] = useState<Date[]>([]);
	const [showResultsButton, setShowResultsButton] = useState(false);
	const showToast = useToast();

	useEffect(() => {
		if (!user) return;
		getMyVote({ data: { token: project.token } })
			.then((vote) => {
				if (vote?.slots) setSchedule(vote.slots.map((s) => new Date(s)));
			})
			.catch(() => {
				showToast({
					body: "could not load your previous vote",
					type: "error",
				});
			});
	}, [user, project.token, showToast]);

	const checkResultsAvailability = useCallback(async () => {
		try {
			setShowResultsButton(
				await isAllowedToViewVotesForProject({
					data: { token: project.token },
				}),
			);
		} catch {
			setShowResultsButton(false);
		}
	}, [project.token]);

	useEffect(() => {
		if (!user) {
			setShowResultsButton(false);
			return;
		}
		checkResultsAvailability();
	}, [user, checkResultsAvailability]);

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
						bottomAllowance={104}
						selection={schedule}
						onChange={setSchedule}
					/>
					<div className="flex w-full items-center justify-center p-4 gap-4">
						<Button
							label="save"
							size="lg"
							variant="primary"
							onClick={async () => {
								try {
									await submitVote({
										data: { token: project.token, slots: schedule },
									});
								} catch (err) {
									showToast({
										body:
											err instanceof Error
												? `could not save your vote: ${err.message}`
												: "could not save your vote",
										type: "error",
									});
									return;
								}
								showToast({ body: "vote has been saved" });
								checkResultsAvailability();
							}}
						/>
						<Link
							to="/project/$projectSlug"
							params={{ projectSlug: project.token }}
						>
							<Button
								className={showResultsButton !== true ? "hidden" : ""}
								size="lg"
								label="see vote results"
								variant="primary"
							/>
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
