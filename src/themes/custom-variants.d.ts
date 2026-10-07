// Hand-written augmentations for custom variants that `astryx theme build`
// (0.1.7) does NOT emit into scheduler.variants.d.ts. The CLI only generates
// `*VariantMap` augmentations (e.g. Badge's `variant`); it skips `type:*`
// overrides on Text, so we declare those here. Keep in sync with the
// `text` component keys in theme.source.ts.
import "@astryxdesign/core/theme";

declare module "@astryxdesign/core/theme" {
	interface CustomTextTypes {
		destructive: true;
	}
}
