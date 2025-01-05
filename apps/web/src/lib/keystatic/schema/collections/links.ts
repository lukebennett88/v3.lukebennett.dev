import { collection, fields } from '@keystatic/core';

import { content } from '../fields/content';

export const links = collection({
	label: 'Links',
	entryLayout: 'content',
	format: {
		contentField: 'content',
	},
	path: 'content/links/*',
	slugField: 'title',
	schema: {
		title: fields.slug({
			name: {
				label: 'Title',
			},
		}),
		publishedAt: fields.date({
			label: 'Published at',
			validation: {
				isRequired: true,
			},
		}),
		linkedUrl: fields.url({
			label: 'Linked URL',
			validation: {
				isRequired: true,
			},
		}),
		content,
	},
});
