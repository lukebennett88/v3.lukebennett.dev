import { singleton } from '@keystatic/core';

import { content } from '../fields/content';

export const homepage = singleton({
	label: 'Homepage',
	entryLayout: 'content',
	format: {
		contentField: 'content',
	},
	path: 'content/homepage',
	schema: {
		content,
	},
});
