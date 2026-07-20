import {
	boolean,
	index,
	integer,
	pgTable,
	smallint,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const projects = pgTable(
	"projects",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		token: varchar({ length: 32 }).unique().notNull(),
		name: varchar({ length: 255 }).notNull(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// range is enforced in createProjectInput (0-23, min < max)
		minTime: smallint().notNull().default(8),
		maxTime: smallint().notNull().default(22),
		hourlyChunks: smallint().notNull().default(1),
		dates: timestamp("dates", { withTimezone: true }).notNull().array(),
		showResultsToGuests: boolean().notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("projects_owner_idx").on(t.ownerId)],
);

export const votes = pgTable(
	"votes",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		projectId: integer("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		// cascade: deleting an account must take the votes it cast with it, otherwise
		// better-auth's deleteUser hits a FK violation for anyone who has ever voted.
		voterId: text("voter_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		voterName: text("voter_name").notNull(),
		slots: timestamp("slots", { withTimezone: true }).array().notNull(),
	},
	(t) => [
		index("votes_project_idx").on(t.projectId),
		unique("one_vote_per_person").on(t.projectId, t.voterId),
	],
);
