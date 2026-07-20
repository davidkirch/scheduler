import { z } from "zod";

// Server-only. Never import this from a component or anything reachable from
// router.tsx — it would carry the secrets into the client bundle.
const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_URL: z.url(),
	BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
	GITHUB_CLIENT_ID: z.string().min(1).optional(),
	GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
});

function parseEnv() {
	// Empty strings come from `FOO=` lines in .env and would satisfy .optional(),
	// so drop them and let the schema treat them as absent.
	const source = Object.fromEntries(
		Object.entries(process.env).filter(([, v]) => v !== ""),
	);

	const result = envSchema.safeParse(source);
	if (!result.success) {
		// ponytail: self-hosters read this in `docker logs`, so a bare ZodError
		// dump is not good enough.
		throw new Error(
			`Invalid environment configuration:\n${z.prettifyError(result.error)}`,
		);
	}

	const env = result.data;
	if (!env.GITHUB_CLIENT_ID !== !env.GITHUB_CLIENT_SECRET) {
		throw new Error(
			"Invalid environment configuration:\nGITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together, or both left unset to disable GitHub login.",
		);
	}

	return env;
}

export const env = parseEnv();
