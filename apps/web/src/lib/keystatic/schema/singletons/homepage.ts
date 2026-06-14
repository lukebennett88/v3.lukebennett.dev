import { singleton } from '@keystatic/core';

import { content } from '../fields/content';

export const homepage = singleton({
	entryLayout: 'content',
	format: {
		contentField: 'content',
	},
	label: 'Homepage',
	path: 'content/homepage',
	schema: {
		content,
	},
});
