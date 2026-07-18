import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowBigLeft, Clipboard, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import ResultsGrid from "@/components/resultsGrid";
import { Button } from "@/components/ui/button";
import { getProjectQuery, votesQuery } from "@/server/projects";

export const Route = createFileRoute("/project/$projectSlug")({
	ssr: false,
	loader: async ({ params, context }) => {
		context.queryClient.ensureQueryData(
			getProjectQuery(Number(params.projectSlug)),
		);
		context.queryClient.ensureQueryData(votesQuery(Number(params.projectSlug)));
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { projectSlug } = Route.useParams();
	const { data: project } = useSuspenseQuery(
		getProjectQuery(Number(projectSlug)),
	);
	const { data: results } = useSuspenseQuery(votesQuery(Number(projectSlug)));

	const queryClient = useQueryClient();
	useEffect(() => {
		const id = Number(projectSlug);
		const es = new EventSource(`/api/votes/${id}/stream`);
		es.onmessage = () =>
			queryClient.invalidateQueries({ queryKey: votesQuery(id).queryKey });
		return () => es.close(); // triggers request.signal abort → server cleanup
	}, [projectSlug, queryClient]);

	const share_link = `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_BASE_URL}/project/${project.id}/vote`;
	const [copied, setCopied] = useState(false);

	return (
		<div className="flex flex-col w-full h-screen bg-blue-200 items-center p-4 gap-4">
			<div className="relative flex w-full justify-center">
				<Link to="/project" preload="intent">
					<Button className="absolute left-0">
						<ArrowBigLeft />
						back to projects
					</Button>
				</Link>
				<h1>{project.name}</h1>
			</div>

			<div className="flex flex-col w-full">
				<h2>results</h2>
				<div className="flex flex-row items-center gap-2">
					<p>vote link: {share_link}</p>
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
