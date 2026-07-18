import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import LoginSignUp from "@/components/logInSignUp";
import SignOutButton from "@/components/signOutButton";
import { Button } from "@/components/ui/button";
import UserBubble from "@/components/userBubble";
import { authClient } from "@/lib/auth-client";
import { projectsQuery, usersQuery } from "@/server/projects";

export const Route = createFileRoute("/")({
	component: App,
	//loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
});

function App() {
	const { data: session, isPending } = authClient.useSession();
	//const { data: projects } = useSuspenseQuery(projectsQuery);

	return (
		<div className="flex flex-col p-4 bg-blue-200 h-screen">
			Hello from index
			<UserBubble />
			{session === null && (
				<div className="w-sm">
					<LoginSignUp offerAnonymous offerSignIn offerSignUp />
				</div>
			)}
			{/* {projects.map((project) => (
				<div key={project.id}>{project.name}</div>
			))} */}
			<Link to="/project">
				<Button>got to projects</Button>
			</Link>
		</div>
	);
}
