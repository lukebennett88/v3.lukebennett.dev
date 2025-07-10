export function ZeroWidthSpace() {
	// biome-ignore lint/complexity/noUselessFragments: the fragment is required here as we want this to be treated as HTML entity and not a string
	return <>&#8203;</>;
}
