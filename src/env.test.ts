import { beforeEach, expect, test, vi } from "vitest";

const valid = {
	DATABASE_URL: "postgres://user:pass@localhost:5432/scheduler",
	BETTER_AUTH_URL: "https://scheduler.example.com",
	BETTER_AUTH_SECRET: "x".repeat(32),
};

/** Load a fresh copy of env.ts against exactly `vars`, ignoring the real env. */
async function loadEnv(vars: Record<string, string>) {
	vi.resetModules();
	vi.unstubAllEnvs();
	for (const key of Object.keys({ ...valid, ...process.env })) {
		vi.stubEnv(key, undefined as unknown as string);
	}
	for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
	return (await import("./env")).env;
}

beforeEach(() => vi.unstubAllEnvs());

test("accepts a complete config without GitHub", async () => {
	const env = await loadEnv(valid);
	expect(env.BETTER_AUTH_SECRET).toBe("x".repeat(32));
	expect(env.GITHUB_CLIENT_ID).toBeUndefined();
});

test("rejects a missing secret", async () => {
	const { BETTER_AUTH_SECRET: _, ...rest } = valid;
	await expect(loadEnv(rest)).rejects.toThrow(/BETTER_AUTH_SECRET/);
});

test("rejects a short secret", async () => {
	await expect(
		loadEnv({ ...valid, BETTER_AUTH_SECRET: "too-short" }),
	).rejects.toThrow(/at least 32 characters/);
});

test("treats an empty value as missing, not as a valid string", async () => {
	await expect(loadEnv({ ...valid, DATABASE_URL: "" })).rejects.toThrow(
		/DATABASE_URL/,
	);
});

test("rejects a DATABASE_URL that is not a connection URL", async () => {
	await expect(
		loadEnv({ ...valid, DATABASE_URL: "localhost:5432/scheduler" }),
	).rejects.toThrow(/DATABASE_URL/);
});

test("rejects a DATABASE_URL with a non-postgres scheme", async () => {
	await expect(
		loadEnv({ ...valid, DATABASE_URL: "mysql://user:pass@localhost:3306/db" }),
	).rejects.toThrow(/postgres/);
});

// biome-ignore lint/suspicious/noTemplateCurlyInString: the unexpanded literal is the point
const UNEXPANDED_URL = "postgresql://${DATABASE_USER}@${DATABASE_HOST}:5432/db";

// The .env.example composes DATABASE_URL from its parts. Vite expands those
// references, a plain dotenv loader does not — so the unexpanded literal must not
// slip through as "valid" and fail later at connect time.
test("rejects an unexpanded placeholder URL", async () => {
	await expect(
		loadEnv({ ...valid, DATABASE_URL: UNEXPANDED_URL }),
	).rejects.toThrow(/DATABASE_URL/);
});

test("rejects a half-configured GitHub provider", async () => {
	await expect(loadEnv({ ...valid, GITHUB_CLIENT_ID: "abc" })).rejects.toThrow(
		/must be set together/,
	);
});

test("accepts both GitHub credentials together", async () => {
	const env = await loadEnv({
		...valid,
		GITHUB_CLIENT_ID: "abc",
		GITHUB_CLIENT_SECRET: "def",
	});
	expect(env.GITHUB_CLIENT_ID).toBe("abc");
});
