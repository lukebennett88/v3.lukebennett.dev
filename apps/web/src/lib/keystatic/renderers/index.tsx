import type { InferRenderersForComponentBlocks } from '@keystatic/core';
import {
	type DocumentRendererProps,
	defaultRenderers,
} from '@keystatic/core/renderer';
import type { Highlighter } from 'shiki';

import type { componentBlocks } from '../component-block';
import { CloudImage } from './cloud-image';
import { Code } from './code';
import { Heading } from './heading';
import { InlineCode } from './inline-code';
import { Link } from './link';

const Table = defaultRenderers.block.table;

/**
 * Single registry for all Keystatic renderers. Returns both the
 * component-block renderers and the document block/inline renderers, with the
 * Shiki highlighter injected as a dependency.
 */
export function createKeystaticRenderers(highlighter: Highlighter): {
	componentBlocks: InferRenderersForComponentBlocks<typeof componentBlocks>;
	renderers: DocumentRendererProps['renderers'];
} {
	return {
		componentBlocks: {
			cloudImage(props) {
				return <CloudImage {...props} />;
			},
		},
		renderers: {
			block: {
				code(props) {
					return <Code {...props} highlighter={highlighter} />;
				},
				heading(props) {
					return <Heading {...props} />;
				},
				table(props) {
					return (
						<section
							className="overflow-x-auto"
							aria-label="Scrollable table"
							// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to focus the scroll container.
							tabIndex={0}
						>
							<Table {...props} />
						</section>
					);
				},
			},
			inline: {
				code(props) {
					return <InlineCode {...props} />;
				},
				link(props) {
					return <Link {...props} />;
				},
			},
		},
	};
}
