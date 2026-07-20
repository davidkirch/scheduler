import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1",
				},
				{
					title: "Appwrite + TanStack Start",
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
				{
					rel: "preconnect",
					href: "https://fonts.googleapis.com",
				},
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossOrigin: "anonymous",
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:opsz,wght@14..32,100..900&family=Poppins:wght@300;400&display=swap",
				},
				{
					rel: "icon",
					type: "image/svg+xml",
					href: "/appwrite.svg",
				},
			],
		}),

		// catch-all: anything a route doesn't handle itself lands here rather than on
		// the framework's default error screen
		errorComponent: ({ error }) => (
			<div className="flex flex-col w-full min-h-dvh items-center justify-center p-8 gap-4 bg-surface-page">
				<h1>something went wrong</h1>
				<p className="text-center">{error.message}</p>
				<a href="/">
					<Button>back to start</Button>
				</a>
			</div>
		),
		notFoundComponent: () => (
			<div className="flex flex-col w-full min-h-dvh items-center justify-center p-8 gap-4 bg-surface-page">
				<h1>page not found</h1>
				<a href="/">
					<Button>back to start</Button>
				</a>
			</div>
		),
		shellComponent: RootDocument,
	},
);

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			{/* suppressHydrationWarning: next-themes sets the class on <html> before React
			    hydrates, so server and client markup differ here by design. */}
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					themes={["light", "dark", "peach"]}
				>
					{children}
					<Toaster />
				</ThemeProvider>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
