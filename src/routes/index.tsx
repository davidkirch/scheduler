import { createFileRoute, useNavigate } from "@tanstack/react-router";
import LoginSignUp from "@/components/logInSignUp";

import UserBubble from "@/components/userBubble";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	component: App,
	//loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
});

function App() {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();

	return (
		<div className="flex flex-col p-4 bg-blue-200 h-screen items-center gap-20">
			<h1>welcome to scheduler</h1>
			<UserBubble />
			{session === null && (
				<div className="w-sm">
					<LoginSignUp
						offerAnonymous
						offerSignIn
						offerSignUp
						asCard
						showTitle
						successAction={() => navigate({ to: "/project" })}
					/>
				</div>
			)}
		</div>
	);
}
