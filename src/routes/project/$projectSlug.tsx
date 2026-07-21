import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Switch } from "@astryxdesign/core/Switch";
import { useToast } from "@astryxdesign/core/Toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowBigLeft, Clipboard, ClipboardCheck, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LabelWithTip } from "@/components/labelWithTip";
import ResultsGrid from "@/components/resultsGrid";
import {
	getProjectQuery,
	updateVisibilityMutation,
	votesQuery,
} from "@/server/projects";

export const Route = createFileRoute("/project/$projectSlug")({
	ssr: false,
	loader: ({ params, context }) =>
		// awaited, so a rejection reaches errorComponent below instead of surfacing
		// as an unhandled rejection
		Promise.all([
			context.queryClient.ensureQueryData(getProjectQuery(params.projectSlug)),
			context.queryClient.ensureQueryData(votesQuery(params.projectSlug)),
		]),
	errorComponent: ({ error }) => (
		<>
			<div className="flex flex-col w-full items-center justify-center p-8 gap-8">
				{error.message}
				<Link to="/project" preload="intent">
					<Button
						label="back to projects"
						variant="primary"
						icon={<ArrowBigLeft />}
					/>
				</Link>
			</div>
		</>
	),
	component: RouteComponent,
});

function RouteComponent() {
	const { projectSlug } = Route.useParams();
	const { data: project } = useSuspenseQuery(getProjectQuery(projectSlug));
	const { data: results } = useSuspenseQuery(votesQuery(projectSlug));

	const [updateVisibilityPending, setUpdateVisibilityPending] = useState(false);
	const showToast = useToast();

	const queryClient = useQueryClient();
	useEffect(() => {
		const es = new EventSource(`/api/votes/${projectSlug}/stream`);
		es.onmessage = () =>
			queryClient.invalidateQueries({
				queryKey: votesQuery(projectSlug).queryKey,
			});
		return () => es.close(); // triggers request.signal abort → server cleanup
	}, [projectSlug, queryClient]);

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const startTimer = () => {
		timerRef.current = setTimeout(() => setUpdateVisibilityPending(true), 250);
	};

	const cancelTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	// a toggle in flight when the user navigates away would otherwise fire setState
	// on an unmounted component
	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const updateVisibility = useMutation({
		...updateVisibilityMutation,
		onMutate: () => {
			startTimer();
		},
		onError: ({ message }) =>
			showToast({
				body: `could not update visibility: ${message}`,
				type: "error",
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries(getProjectQuery(projectSlug));
			showToast({ body: "updated visibility" });
		},
		onSettled: () => {
			setUpdateVisibilityPending(false);
			cancelTimer();
		},
	});

	const share_link = `${window.location.origin}/project/${project.token}/vote`;
	const [copied, setCopied] = useState(false);

	return (
		<div className="flex flex-col w-full min-h-dvh bg-surface-page items-center p-4 gap-4">
			<div className="relative flex w-full justify-center">
				<Link to="/project" preload="intent">
					<Button
						label="back to projects"
						variant="primary"
						icon={<ArrowBigLeft />}
						className="absolute left-0"
					/>
				</Link>
				<h1>{project.name}</h1>
			</div>

			<div className="flex flex-col w-full">
				<h2>results</h2>
				<div className="flex flex-row items-center gap-2">
					<a href={share_link}>vote link: {share_link}</a>
					<IconButton
						label={copied ? "copied vote link" : "copy vote link"}
						variant="ghost"
						icon={copied ? <ClipboardCheck /> : <Clipboard />}
						onClick={() => {
							navigator.clipboard.writeText(share_link);
							setCopied(true);
							setTimeout(() => {
								setCopied(false);
							}, 3_000);
						}}
					/>
				</div>
				<div className="flex flex-col pt-2 pb-2">
					<LabelWithTip
						label="show results to guests"
						tipContent="if checked, guests can see results. if not only you are able to view results."
					/>
					<div className="flex flex-row gap-2 items-center">
						<Switch
							label="show results to guests"
							isLabelHidden
							value={project.showResultsToGuests}
							onChange={(state) => {
								if (state !== project.showResultsToGuests) {
									updateVisibility.mutate({
										token: project.token,
										showResultsToGuests: state,
									});
								}
							}}
						/>
						{updateVisibilityPending && (
							<Loader2 size={18} className="animate-spin" />
						)}
					</div>
				</div>

				{results.allowed ? (
					<ResultsGrid project={project} votes={results.votes} />
				) : (
					<p className="py-4">
						the owner has kept the results to themselves — you can still vote
					</p>
				)}
			</div>
		</div>
	);
}
