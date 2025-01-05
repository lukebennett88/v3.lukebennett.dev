import {
	type DocumentRendererProps,
	DocumentRenderer as KeystaticDocumentRenderer,
} from '@keystatic/core/renderer';
import { highlighter } from '../highlighter';
import { componentBlockRenderers, getDocumentRenderers } from './renderers';

export function DocumentRenderer(props: DocumentRendererProps) {
	const {
		componentBlocks = componentBlockRenderers,
		renderers = getDocumentRenderers(highlighter),
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
