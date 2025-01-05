import type { InferRenderersForComponentBlocks } from '@keystatic/core';
import type { DocumentRendererProps } from '@keystatic/core/renderer';
import type { Highlighter } from 'shiki';

import type { componentBlocks } from '../component-block';
import { CloudImage } from './cloud-image';
import { Code } from './code';
import { Heading } from './heading';
import { InlineCode } from './inline-code';
import { Link } from './link';

export function getDocumentRenderers(highlighter: Highlighter) {
	return {
		block: {
			code(props) {
				return <Code {...props} highlighter={highlighter} />;
			},
			heading(props) {
				return <Heading {...props} />;
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
	} satisfies DocumentRendererProps['renderers'];
}

export const componentBlockRenderers = {
	cloudImage(props) {
		return <CloudImage {...props} />;
	},
} satisfies InferRenderersForComponentBlocks<typeof componentBlocks>;
