import { createFileRoute } from "@tanstack/react-router";
import { client } from "@/db";

export const Route = createFileRoute("/api/votes/$id/stream")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const projectId = params.id;
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
