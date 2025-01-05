import { fields } from '@keystatic/core';

import { componentBlocks } from '../../component-block';

export const content = fields.document({
	label: 'Content',
	componentBlocks,
	formatting: true,
	dividers: true,
	links: true,
	tables: true,
});
