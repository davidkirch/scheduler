import { z } from "zod";

// Server-only. Never import this from a component or anything reachable from
// router.tsx — it would carry the secrets into the client bundle.
const envSchema = z.object({
	// postgres-js accepts any URL shape and only fails on first connect, which is a
	// confusing crash long after boot. Check the scheme up front instead.
	DATABASE_URL: z
		.url({ error: "must be a valid connection URL" })
		.refine(
			(v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
			"must start with postgres:// or postgresql://",
		)
		// A composed `DATABASE_URL=postgresql://${DATABASE_USER}@...` is expanded by
		// Vite but not by a plain dotenv loader, so the raw placeholders can survive
		// into a URL that still parses. Catch it here rather than at connect time.
		.refine(
			(v) => !/\$\{\w+\}/.test(v),
			"contains unexpanded placeholders — write the connection URL out in full",
		),
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
