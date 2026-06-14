import { collection, fields } from '@keystatic/core';

import { content } from '../fields/content';

export const links = collection({
	entryLayout: 'content',
	format: {
		contentField: 'content',
	},
	label: 'Links',
	path: 'content/links/*',
	schema: {
		content,
		linkedUrl: fields.url({
			label: 'Linked URL',
			validation: {
				isRequired: true,
			},
		}),
		publishedAt: fields.date({
			label: 'Published at',
			validation: {
				isRequired: true,
			},
		}),
		title: fields.slug({
			name: {
				label: 'Title',
			},
		}),
	},
	slugField: 'title',
});
