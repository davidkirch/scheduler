import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [anonymousClient()],
	// better-fetch resolves { data, error } instead of throwing by default, which makes
	// every `try/catch` around an auth call dead code and lets a failed sign-in look
	// identical to a successful one. Opt into throwing so callers can handle failures.
	fetchOptions: { throw: true },
});

export const { signIn, signUp, signOut, useSession } = authClient;
