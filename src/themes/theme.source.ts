import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export const schedulerTheme = defineTheme({
	name: "scheduler",
	extends: neutralTheme,

	// base: 0 squares off inner/element/container/page/chat radii.
	// --radius-full is generated separately and stays 9999px, so avatars,
	// status dots and spinners keep their circles.
	radius: { base: 0, multiplier: 1 },

	typography: {
		scale: { base: 16, ratio: 1.2 },
		// Must match --font-sans in styles.css — the Tailwind bridge and the
		// Astryx tokens are two views of the same font. The family name is the
		// one @fontsource/courier-prime registers, not the generic "courier".
		body: { family: "Courier Prime", fallbacks: "monospace" },
		heading: { family: "Courier Prime", fallbacks: "monospace" },
		code: { family: "Courier Prime", fallbacks: "monospace" },
	},

	// Astryx reads its palette from the app's own tokens rather than carrying a
	// second copy of it. These are var() references, not values, so they need no
	// [light, dark] tuples: the referenced token flips instead, under .dark or
	// .peach on <html>. That keeps styles.css the single place a colour is
	// chosen, and this the single place the two systems are wired together.
	tokens: {
		"--color-accent": "var(--primary)",
		"--color-accent-muted": "var(--secondary)",
		"--color-background-body": "var(--surface-page)",
		"--color-background-card": "var(--card)",
		"--color-background-muted": "var(--muted)",
		"--color-background-popover": "var(--popover)",
		"--color-background-surface": "var(--background)",
		"--color-border": "var(--border)",
		"--color-border-emphasized": "var(--primary)",
		"--color-icon-accent": "var(--primary)",
		"--color-icon-primary": "var(--foreground)",
		"--color-icon-secondary": "var(--foreground)",
		"--color-on-accent": "var(--primary-foreground)",
		"--color-text-accent": "var(--primary)",
		"--color-text-primary": "var(--foreground)",
		"--color-text-secondary": "var(--foreground)",
	},

	components: {
		// `astryx theme build` v0.1.7 warns "Unknown component" for these three
		// and suggests "tablist". Ignore it: `astryx component TabList` documents
		// astryx-tab-list / astryx-tab / astryx-tab-indicator as the theming
		// targets, and these keys emit exactly those classes. "tablist" would
		// emit .astryx-tablist, which matches nothing.
		"tab-list": {
			base: {
				backgroundColor: "var(--color-background-muted)",
				padding: "var(--spacing-1)",
			},
		},
		tab: {
			base: {
				borderRadius: "0",
				color: "var(--color-text-primary)",
				height: "100%",
			},
			selected: {
				backgroundColor: "var(--color-background-surface)",
			},
		},
		"tab-indicator": {
			base: {
				display: "none",
			},
		},

		// Custom text type. !important is load-bearing: Text's `color` prop is a
		// separate axis that defaults to "primary" for any type it doesn't know,
		// and the generated .astryx-text.primary rule lands after this one at
		// equal specificity. Without it every call site would need
		// color="inherit". Trade-off: a `color` prop or xstyle can no longer
		// recolour this type. Drop the !important if core is upgraded past 0.1.7,
		// where `color` became extensible and a "color:destructive" key works.
		// Keep the `destructive` key in themes/custom-variants.d.ts in sync.
		text: {
			"type:destructive": {
				color: "#FB2C36 !important",
			},
		},
	},
});
