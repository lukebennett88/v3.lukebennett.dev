import {
	type DocumentRendererProps,
	DocumentRenderer as KeystaticDocumentRenderer,
} from '@keystatic/core/renderer';
import type { Highlighter } from 'shiki';

import { highlighter as defaultHighlighter } from '../highlighter';
import { createKeystaticRenderers } from './renderers';

export function DocumentRenderer({
	highlighter = defaultHighlighter,
	...props
}: DocumentRendererProps & { highlighter?: Highlighter }) {
	const registry = createKeystaticRenderers(highlighter);
	const {
		componentBlocks = registry.componentBlocks,
		renderers = registry.renderers,
		...consumerProps
	} = props;

	return (
		<KeystaticDocumentRenderer
			componentBlocks={componentBlocks}
			renderers={renderers}
			{...consumerProps}
		/>
	);
}
