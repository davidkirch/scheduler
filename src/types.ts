import type { projects, votes } from "@/db/schema";

// Row shapes inferred straight from the Drizzle schema — no separate hand-written types.
export type Project = typeof projects.$inferSelect;
export type Vote = typeof votes.$inferSelect;
