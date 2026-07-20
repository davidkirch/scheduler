import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowBigLeft, Clipboard, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LabelWithTip } from "@/components/labelWithTip";
import ResultsGrid from "@/components/resultsGrid";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	getProjectQuery,
	updateVisibilityMutation,
	votesQuery,
} from "@/server/projects";

export const Route = createFileRoute("/project/$projectSlug")({
	ssr: false,
	loader: async ({ params, context }) => {
		context.queryClient.ensureQueryData(getProjectQuery(params.projectSlug));
		context.queryClient.ensureQueryData(votesQuery(params.projectSlug));
	},
	errorComponent: ({ error }) => (
		<>
			<div className="flex flex-col w-full items-center justify-center p-8 gap-8">
				{error.message}
				<Link to="/project" preload="intent">
					<Button>
						<ArrowBigLeft />
						<p>back to projects</p>
					</Button>
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

	const queryClient = useQueryClient();
	useEffect(() => {
		const es = new EventSource(`/api/votes/${projectSlug}/stream`);
		es.onmessage = () =>
			queryClient.invalidateQueries({
				queryKey: votesQuery(projectSlug).queryKey,
			});
		return () => es.close(); // triggers request.signal abort → server cleanup
	}, [projectSlug, queryClient]);

	const updateVisibility = useMutation({
		...updateVisibilityMutation,
		onSuccess: () => {
			toast.success("updated visibility");
			queryClient.invalidateQueries(getProjectQuery(projectSlug));
		},
	});

	const share_link = `${window.location.origin}/project/${project.token}/vote`;
	const [copied, setCopied] = useState(false);

	return (
		<div className="flex flex-col w-full min-h-dvh bg-surface-page items-center p-4 gap-4">
			<div className="relative flex w-full justify-center">
				<Link to="/project" preload="intent">
					<Button className="absolute left-0">
						<ArrowBigLeft />
						<p className="max-sm:hidden">back to projects</p>
					</Button>
				</Link>
				<h1>{project.name}</h1>
			</div>

			<div className="flex flex-col w-full">
				<h2>results</h2>
				<div className="flex flex-row items-center gap-2">
					<a href={share_link}>vote link: {share_link}</a>
					<Button
						variant="ghost"
						onClick={() => {
							navigator.clipboard.writeText(share_link);
							setCopied(true);
							setTimeout(() => {
								setCopied(false);
							}, 3_000);
						}}
					>
						{copied ? <ClipboardCheck /> : <Clipboard />}
					</Button>
				</div>
				<div className="flex flex-col pt-2 pb-2">
					<LabelWithTip
						label="show results to guests"
						tipContent="if checked, guests can see results. if not only you are able to view results."
					/>
					<Switch
						name="show-results-to-guests"
						checked={project.showResultsToGuests}
						onCheckedChange={(state) => {
							if (state !== project.showResultsToGuests) {
								updateVisibility.mutate({
									token: project.token,
									showResultsToGuests: state,
								});
							}
						}}
					/>
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
