import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";
export const schedulerTheme = defineTheme({
	name: "scheduler",
	extends: neutralTheme,
	tokens: {},
	radius: { base: 0, multiplier: 1 },
	typography: {
		scale: { base: 16, ratio: 1.2 },
		body: { family: "courier", fallbacks: "-apple-system, sans-serif" },
	},
	components: {
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
	},
});
/* export const schedulerTheme = defineTheme({
	name: "scheduler",
	extends: neutralTheme,
	tokens: {
		"--color-accent": ["oklch(0.205 0 0)", "oklch(0.922 0 0)"],
		"--color-accent-muted": ["oklch(0.97 0 0)", "oklch(0.269 0 0)"],
		"--color-background-body": [
			"oklch(0.882 0.059 254.1)",
			"oklch(0.256 0.043 254.1)",
		],
		"--color-background-card": ["oklch(1 0 0)", "oklch(0.205 0 0)"],
		"--color-background-muted": ["oklch(0.97 0 0)", "oklch(0.269 0 0)"],
		"--color-background-popover": ["oklch(1 0 0)", "oklch(0.205 0 0)"],
		"--color-background-surface": ["oklch(1 0 0)", "oklch(0.145 0 0)"],
		"--color-border": ["oklch(0.922 0 0)", "oklch(1 0 0 / 10%)"],
		"--color-border-emphasized": ["oklch(0.205 0 0)", "oklch(0.922 0 0)"],
		"--color-icon-accent": ["oklch(0.205 0 0)", "oklch(0.922 0 0)"],
		"--color-icon-primary": ["oklch(0.145 0 0)", "oklch(0.985 0 0)"],
		"--color-icon-secondary": ["oklch(0.145 0 0)", "oklch(0.985 0 0)"],
		"--color-on-accent": ["oklch(0.985 0 0)", "oklch(0.205 0 0)"],
		"--color-text-accent": ["oklch(0.205 0 0)", "oklch(0.922 0 0)"],
		"--color-text-primary": ["oklch(0.145 0 0)", "oklch(0.985 0 0)"],
		"--color-text-secondary": ["oklch(0.145 0 0)", "oklch(0.985 0 0)"],
		"--font-family-body": "'Courier Prime', monospace",
		"--font-family-heading": "'Courier Prime', monospace",
		"--font-family-code": "'Courier Prime', monospace",
		"--radius-chat": "0",
		"--radius-container": "0",
		"--radius-element": "0",
		"--radius-full": "0",
		"--radius-inner": "0",
		"--radius-none": "0",
		"--radius-page": "0",
	},
}); */
