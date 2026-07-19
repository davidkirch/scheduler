import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/project/vote")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/project/vote"!</div>;
}
