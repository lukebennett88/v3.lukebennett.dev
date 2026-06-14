import { fields } from '@keystatic/core';

import { componentBlocks } from '../../component-block';

export const content = fields.document({
	componentBlocks,
	dividers: true,
	formatting: true,
	label: 'Content',
	links: true,
	tables: true,
});
