import { Heading, Text } from "@astryxdesign/core";
import { Button } from "@astryxdesign/core/Button";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { Theme } from "@astryxdesign/core/theme";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider, useTheme } from "next-themes";
import { schedulerTheme } from "@/theme.source";
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
				<Text>something went wrong</Text>
				<Text>{error.message}</Text>
				<a href="/">
					<Button label="back to start" variant="primary" />
				</a>
			</div>
		),
		notFoundComponent: () => (
			<div className="flex flex-col w-full min-h-dvh items-center justify-center p-8 gap-4 bg-surface-page">
				<Heading level={1}>page not found</Heading>
				<a href="/">
					<Button label="back to start" variant="primary" />
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
					<AstryxThemeBridge>{children}</AstryxThemeBridge>
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

function AstryxThemeBridge({ children }: { children: React.ReactNode }) {
	const { resolvedTheme, theme } = useTheme();
	const mode =
		theme === "system" ? "system" : resolvedTheme === "dark" ? "dark" : "light";

	return (
		<Theme theme={schedulerTheme} mode={mode}>
			<ToastViewport position="topEnd" maxVisible={3}>
				{children}
			</ToastViewport>
		</Theme>
	);
}
