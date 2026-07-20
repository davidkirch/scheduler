import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { client, db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/votes/$id/stream")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const projectId = params.id;

				// Same gate as getVotesForProject: this stream announces vote activity,
				// so anyone who may not read the results may not watch them arrive.
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session?.user)
					return new Response("unauthorized", { status: 401 });

				const [project] = await db
					.select()
					.from(projects)
					.where(eq(projects.token, projectId))
					.limit(1);
				if (!project) return new Response("not found", { status: 404 });
				if (project.ownerId !== session.user.id && !project.showResultsToGuests)
					return new Response("forbidden", { status: 403 });

				const enc = new TextEncoder();

				const stream = new ReadableStream({
					async start(controller) {
						// listeners share one dedicated connection on the `client`
						// instance, so N open tabs = 1 extra PG connection total.
						const sub = await client.listen("votes", (payload) => {
							if (payload === projectId)
								controller.enqueue(enc.encode(`data: changed\n\n`));
						});
						// keep-alive comment so proxies don't drop an idle stream
						const ping = setInterval(
							() => controller.enqueue(enc.encode(`: ping\n\n`)),
							25_000,
						);

						// one idempotent teardown — abort fires on client disconnect
						// (tab close / navigate / es.close()). guard against double-fire.
						let done = false;
						const cleanup = async () => {
							if (done) return;
							done = true;
							clearInterval(ping);
							await sub.unlisten();
							try {
								controller.close();
							} catch {}
						};
						request.signal.addEventListener("abort", cleanup);

						controller.enqueue(enc.encode(`: connected\n\n`));
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			},
		},
	},
});
